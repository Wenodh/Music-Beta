-- Harden room membership and moderation authority.
-- Client broadcasts are hints; database rows and RPCs remain authoritative.

-- SECURITY DEFINER helpers avoid cross-table RLS recursion while checking room membership.
CREATE OR REPLACE FUNCTION public.is_room_member(target_room_code TEXT, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $is_member$
    SELECT target_user_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.listening_rooms r
        JOIN public.room_participants rp ON rp.room_id = r.id
        WHERE r.room_code = target_room_code
          AND rp.user_id = target_user_id
          AND rp.status IN ('joined', 'reconnecting', 'muted')
    );
$is_member$;

CREATE OR REPLACE FUNCTION public.is_room_host(target_room_code TEXT, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $is_host$
    SELECT target_user_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.listening_rooms r
        JOIN public.room_participants rp ON rp.room_id = r.id
        WHERE r.room_code = target_room_code
          AND r.host_id = target_user_id
          AND rp.user_id = target_user_id
          AND rp.status IN ('joined', 'reconnecting', 'muted')
    );
$is_host$;

CREATE OR REPLACE FUNCTION public.can_access_listening_room(target_room_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $can_access$
    SELECT EXISTS (
        SELECT 1
        FROM public.listening_rooms r
        WHERE r.id = target_room_id
          AND (
                (r.is_public = true AND r.status IN ('active', 'reconnecting', 'paused'))
                OR public.is_room_member(r.room_code, target_user_id)
          )
    );
$can_access$;

REVOKE ALL ON FUNCTION public.is_room_member(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_room_host(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_listening_room(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_member(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_host(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_listening_room(UUID, UUID) TO anon, authenticated;

-- A participant must not self-assign host/co-host/moderator roles or rejoin after a kick.
DROP POLICY IF EXISTS "Host and co-hosts can update room" ON public.listening_rooms;
DROP POLICY IF EXISTS "Host can update room" ON public.listening_rooms;
CREATE POLICY "Host can update room" ON public.listening_rooms
    FOR UPDATE
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Anyone can view active public rooms or rooms they participate in" ON public.listening_rooms;
CREATE POLICY "Anyone can view active public rooms or rooms they participate in" ON public.listening_rooms
    FOR SELECT USING (public.can_access_listening_room(id, auth.uid()));

DROP POLICY IF EXISTS "Participants can view room roster" ON public.room_participants;
CREATE POLICY "Participants can view room roster" ON public.room_participants
    FOR SELECT USING (
        auth.uid() = user_id
        OR public.can_access_listening_room(room_id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can join room" ON public.room_participants;
-- All new joins and re-joins must pass through join_listening_room(), which
-- checks bans, capacity, room status, and the caller's authoritative role.
REVOKE INSERT, DELETE ON public.room_participants FROM anon, authenticated;

DROP POLICY IF EXISTS "Users or host can update participant state" ON public.room_participants;
CREATE POLICY "Users or host can update participant state" ON public.room_participants
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND status <> 'kicked')
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id
              AND r.host_id = auth.uid()
        )
    )
    WITH CHECK (
        (
            auth.uid() = user_id
            AND status IN ('left', 'reconnecting', 'muted')
            AND role = CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.listening_rooms r
                    WHERE r.id = room_id AND r.host_id = auth.uid()
                ) THEN 'host'
                WHEN EXISTS (
                    SELECT 1 FROM public.listening_rooms r
                    WHERE r.id = room_id AND auth.uid() = ANY(r.co_host_ids)
                ) THEN 'co-host'
                ELSE 'listener'
            END
        )
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id
              AND r.host_id = auth.uid()
        )
    );

-- Private room channels are authorized against the authenticated JWT identity.
-- Participants may publish chat/signaling/presence and requestSync; only the
-- database host may publish authoritative sync, moderation, or host-election events.
DROP POLICY IF EXISTS "VibeOn room members can read private room messages" ON realtime.messages;
CREATE POLICY "VibeOn room members can read private room messages"
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
        topic LIKE 'room:%'
        AND extension IN ('broadcast', 'presence')
        AND public.is_room_member(split_part(topic, ':', 2), auth.uid())
    );

DROP POLICY IF EXISTS "VibeOn room members can send private room messages" ON realtime.messages;
CREATE POLICY "VibeOn room members can send private room messages"
    ON realtime.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        topic LIKE 'room:%'
        AND extension IN ('broadcast', 'presence')
        AND public.is_room_member(split_part(topic, ':', 2), auth.uid())
    );

DROP POLICY IF EXISTS "VibeOn only room members can access room topics" ON realtime.messages;
CREATE POLICY "VibeOn only room members can access room topics"
    ON realtime.messages
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        topic NOT LIKE 'room:%'
        OR topic = 'room:lobby'
        OR public.is_room_member(split_part(topic, ':', 2), auth.uid())
    )
    WITH CHECK (
        topic NOT LIKE 'room:%'
        OR topic = 'room:lobby'
        OR public.is_room_member(split_part(topic, ':', 2), auth.uid())
    );

DROP POLICY IF EXISTS "VibeOn only room host can send authoritative events" ON realtime.messages;
CREATE POLICY "VibeOn only room host can send authoritative events"
    ON realtime.messages
    AS RESTRICTIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (
        extension <> 'broadcast'
        OR event NOT IN ('sync', 'moderation', 'host_elected')
        OR (
            event = 'sync'
            AND payload ->> 'type' IN ('requestSync', 'reaction')
        )
        OR public.is_room_host(split_part(topic, ':', 2), auth.uid())
    );

CREATE OR REPLACE FUNCTION public.join_listening_room(target_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $join_room$
DECLARE
    caller_id UUID := auth.uid();
    room_row public.listening_rooms%ROWTYPE;
    existing_status TEXT;
    active_count INTEGER;
    participant_role TEXT;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to join a listening room';
    END IF;

    SELECT * INTO room_row
    FROM public.listening_rooms
    WHERE room_code = target_room_code OR id::text = target_room_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listening room not found';
    END IF;

    IF room_row.status NOT IN ('active', 'reconnecting', 'paused') THEN
        RAISE EXCEPTION 'Listening room is not accepting participants';
    END IF;

    SELECT status INTO existing_status
    FROM public.room_participants
    WHERE room_id = room_row.id AND user_id = caller_id;

    IF existing_status = 'kicked' THEN
        RAISE EXCEPTION 'You have been removed from this listening room';
    END IF;

    IF caller_id <> room_row.host_id
       AND NOT (caller_id = ANY(room_row.co_host_ids))
       AND EXISTS (
            SELECT 1
            FROM public.friendships f
            WHERE f.status = 'blocked'
              AND f.blocked_by = room_row.host_id
              AND f.user_id_1 = LEAST(room_row.host_id, caller_id)
              AND f.user_id_2 = GREATEST(room_row.host_id, caller_id)
       ) THEN
        RAISE EXCEPTION 'You cannot join this listening room';
    END IF;

    SELECT COUNT(*) INTO active_count
    FROM public.room_participants rp
    WHERE rp.room_id = room_row.id
      AND rp.status IN ('joined', 'reconnecting', 'muted')
      AND rp.user_id <> caller_id;

    IF caller_id <> room_row.host_id
       AND NOT (caller_id = ANY(room_row.co_host_ids))
       AND active_count >= room_row.max_participants THEN
        RAISE EXCEPTION 'Listening room is full';
    END IF;

    participant_role := CASE
        WHEN caller_id = room_row.host_id THEN 'host'
        WHEN caller_id = ANY(room_row.co_host_ids) THEN 'co-host'
        ELSE 'listener'
    END;

    INSERT INTO public.room_participants AS existing (room_id, user_id, role, status, last_ping)
    VALUES (room_row.id, caller_id, participant_role, 'joined', NOW())
    ON CONFLICT (room_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
            status = 'joined',
            last_ping = NOW()
        WHERE existing.status <> 'kicked';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'You have been removed from this listening room';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', room_row.id,
        'host_id', room_row.host_id,
        'co_host_ids', room_row.co_host_ids,
        'settings', room_row.settings
    );
END;
$join_room$;

REVOKE ALL ON FUNCTION public.join_listening_room(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_listening_room(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_listening_room(target_room_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $leave_room$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.room_participants rp
    SET status = 'left',
        last_ping = NOW()
    FROM public.listening_rooms r
    WHERE r.room_code = target_room_code
      AND rp.room_id = r.id
      AND rp.user_id = caller_id
      AND rp.status <> 'kicked';

    RETURN FOUND;
END;
$leave_room$;

REVOKE ALL ON FUNCTION public.leave_listening_room(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_listening_room(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_room_participant_status(target_room_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $room_status$
DECLARE
    caller_id UUID := auth.uid();
    participant_status TEXT;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT rp.status INTO participant_status
    FROM public.room_participants rp
    JOIN public.listening_rooms r ON r.id = rp.room_id
    WHERE r.room_code = target_room_code
      AND rp.user_id = caller_id;

    RETURN participant_status;
END;
$room_status$;

REVOKE ALL ON FUNCTION public.get_room_participant_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_room_participant_status(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_room_participant(
    target_room_code VARCHAR,
    target_user_id UUID,
    moderation_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_id UUID := auth.uid();
    room_row public.listening_rooms%ROWTYPE;
    affected_rows INTEGER;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF moderation_action NOT IN ('kick', 'mute', 'unmute') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid moderation action');
    END IF;

    IF target_user_id IS NULL OR target_user_id = caller_id THEN
        RAISE EXCEPTION 'Invalid moderation target';
    END IF;

    SELECT * INTO room_row
    FROM public.listening_rooms
    WHERE room_code = target_room_code OR id::text = target_room_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listening room not found';
    END IF;

    IF room_row.host_id <> caller_id
       AND NOT (caller_id = ANY(room_row.co_host_ids)) THEN
        RAISE EXCEPTION 'Only the host or an authorized co-host can moderate this room';
    END IF;

    IF target_user_id = room_row.host_id THEN
        RAISE EXCEPTION 'The room host cannot be moderated';
    END IF;

    IF moderation_action = 'kick' THEN
        UPDATE public.room_participants
        SET status = 'kicked', last_ping = NOW()
        WHERE room_id = room_row.id
          AND user_id = target_user_id
          AND status <> 'kicked';
    ELSIF moderation_action = 'mute' THEN
        UPDATE public.room_participants
        SET status = 'muted', last_ping = NOW()
        WHERE room_id = room_row.id
          AND user_id = target_user_id
          AND status IN ('joined', 'reconnecting');
    ELSE
        UPDATE public.room_participants
        SET status = 'joined', last_ping = NOW()
        WHERE room_id = room_row.id
          AND user_id = target_user_id
          AND status = 'muted';
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Participant is not eligible for this moderation action'
        );
    END IF;

    IF moderation_action = 'kick' THEN
        UPDATE public.listening_rooms
        SET co_host_ids = array_remove(co_host_ids, target_user_id),
            updated_at = NOW()
        WHERE id = room_row.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'room_code', room_row.room_code,
        'target_user_id', target_user_id,
        'action', moderation_action
    );
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_room_participant(VARCHAR, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_room_participant(VARCHAR, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_room_chat_muted(
    target_room_code TEXT,
    is_muted BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_id UUID := auth.uid();
    room_row public.listening_rooms%ROWTYPE;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO room_row
    FROM public.listening_rooms
    WHERE room_code = target_room_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listening room not found';
    END IF;

    IF room_row.host_id <> caller_id
       AND NOT (caller_id = ANY(room_row.co_host_ids)) THEN
        RAISE EXCEPTION 'Only the host or an authorized co-host can mute room chat';
    END IF;

    UPDATE public.listening_rooms
    SET settings = jsonb_set(
            COALESCE(settings, '{}'::jsonb),
            '{mute_chat}',
            to_jsonb(COALESCE(is_muted, false)),
            true
        ),
        updated_at = NOW()
    WHERE id = room_row.id;

    RETURN jsonb_build_object('success', true, 'is_muted', COALESCE(is_muted, false));
END;
$$;

REVOKE ALL ON FUNCTION public.set_room_chat_muted(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_room_chat_muted(TEXT, BOOLEAN) TO authenticated;
