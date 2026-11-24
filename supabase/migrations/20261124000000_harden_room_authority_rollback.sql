-- Rollback for 20261124000000_harden_room_authority.sql
DROP POLICY IF EXISTS "VibeOn only room host can send authoritative events" ON realtime.messages;
DROP POLICY IF EXISTS "VibeOn only room members can access room topics" ON realtime.messages;
DROP POLICY IF EXISTS "VibeOn room members can send private room messages" ON realtime.messages;
DROP POLICY IF EXISTS "VibeOn room members can read private room messages" ON realtime.messages;
DROP FUNCTION IF EXISTS public.get_room_participant_status(TEXT);
DROP FUNCTION IF EXISTS public.join_listening_room(TEXT);
DROP FUNCTION IF EXISTS public.leave_listening_room(TEXT);
DROP FUNCTION IF EXISTS public.set_room_chat_muted(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.moderate_room_participant(VARCHAR, UUID, TEXT);

-- Restore the original moderation RPC behavior.
CREATE OR REPLACE FUNCTION public.moderate_room_participant(
    target_room_code VARCHAR,
    target_user_id UUID,
    moderation_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $original_moderation$
DECLARE
    cur_user_id UUID := auth.uid();
    cur_room public.listening_rooms%ROWTYPE;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO cur_room
    FROM public.listening_rooms
    WHERE room_code = target_room_code OR id::text = target_room_code;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found');
    END IF;

    IF cur_room.host_id <> cur_user_id AND NOT (cur_user_id = ANY(cur_room.co_host_ids)) THEN
        RAISE EXCEPTION 'Not authorized to moderate this room';
    END IF;

    IF moderation_action = 'kick' THEN
        UPDATE public.room_participants
        SET status = 'kicked', last_ping = NOW()
        WHERE room_id = cur_room.id AND user_id = target_user_id;

        RETURN jsonb_build_object('success', true, 'action', 'kick', 'target_user_id', target_user_id);
    ELSIF moderation_action = 'mute' THEN
        UPDATE public.room_participants
        SET status = 'muted', last_ping = NOW()
        WHERE room_id = cur_room.id AND user_id = target_user_id;

        RETURN jsonb_build_object('success', true, 'action', 'mute', 'target_user_id', target_user_id);
    ELSIF moderation_action = 'unmute' THEN
        UPDATE public.room_participants
        SET status = 'joined', last_ping = NOW()
        WHERE room_id = cur_room.id AND user_id = target_user_id;

        RETURN jsonb_build_object('success', true, 'action', 'unmute', 'target_user_id', target_user_id);
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid moderation action');
    END IF;
END;
$original_moderation$;

GRANT EXECUTE ON FUNCTION public.moderate_room_participant(VARCHAR, UUID, TEXT) TO authenticated;

GRANT INSERT, DELETE ON public.room_participants TO anon, authenticated;

DROP POLICY IF EXISTS "Host can update room" ON public.listening_rooms;
CREATE POLICY "Host and co-hosts can update room" ON public.listening_rooms
    FOR UPDATE USING (
        auth.uid() = host_id OR auth.uid() = ANY(co_host_ids)
    ) WITH CHECK (
        auth.uid() = host_id OR auth.uid() = ANY(co_host_ids)
    );

DROP POLICY IF EXISTS "Anyone can view active public rooms or rooms they participate in" ON public.listening_rooms;
CREATE POLICY "Anyone can view active public rooms or rooms they participate in" ON public.listening_rooms
    FOR SELECT USING (
        (is_public = true AND status IN ('active', 'reconnecting', 'paused'))
        OR host_id = auth.uid()
        OR auth.uid() = ANY(co_host_ids)
        OR EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = listening_rooms.id
              AND rp.user_id = auth.uid()
              AND rp.status <> 'kicked'
        )
    );

DROP POLICY IF EXISTS "Participants can view room roster" ON public.room_participants;
CREATE POLICY "Participants can view room roster" ON public.room_participants
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id
              AND ((r.is_public = true AND r.status <> 'closed') OR r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
        OR EXISTS (
            SELECT 1 FROM public.room_participants peer
            WHERE peer.room_id = room_participants.room_id
              AND peer.user_id = auth.uid()
              AND peer.status <> 'kicked'
        )
    );

DROP FUNCTION IF EXISTS public.can_access_listening_room(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_room_host(TEXT, UUID);
DROP FUNCTION IF EXISTS public.is_room_member(TEXT, UUID);

-- Restore the previous participant policies. These intentionally restore the
-- prior behavior and therefore also restore its role-escalation/rejoin weakness.
DROP POLICY IF EXISTS "Users can join room" ON public.room_participants;
CREATE POLICY "Users can join room" ON public.room_participants
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND NOT EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id
              AND rp.user_id = auth.uid()
              AND rp.status = 'kicked'
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.listening_rooms r
            JOIN public.friendships f ON f.status = 'blocked' AND f.blocked_by = r.host_id
            WHERE r.id = room_participants.room_id
              AND f.user_id_1 = LEAST(r.host_id, auth.uid())
              AND f.user_id_2 = GREATEST(r.host_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users or host can update participant state" ON public.room_participants;
CREATE POLICY "Users or host can update participant state" ON public.room_participants
    FOR UPDATE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id
              AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id
              AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
    );
