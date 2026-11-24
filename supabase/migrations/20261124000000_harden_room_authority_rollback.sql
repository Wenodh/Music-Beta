-- Rollback for 20261124000000_harden_room_authority.sql
DROP POLICY IF EXISTS "VibeOn only room host can send authoritative events" ON realtime.messages;
DROP POLICY IF EXISTS "VibeOn room members can send private room messages" ON realtime.messages;
DROP POLICY IF EXISTS "VibeOn room members can read private room messages" ON realtime.messages;
DROP FUNCTION IF EXISTS public.get_room_participant_status(TEXT);
DROP FUNCTION IF EXISTS public.join_listening_room(TEXT);
DROP FUNCTION IF EXISTS public.set_room_chat_muted(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.moderate_room_participant(TEXT, UUID, TEXT);

GRANT INSERT ON public.room_participants TO anon, authenticated;

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
