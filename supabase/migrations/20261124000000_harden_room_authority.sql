-- Harden room membership and moderation authority.
-- Client broadcasts are hints; database rows and RPCs remain authoritative.

-- A participant must not self-assign host/co-host/moderator roles or rejoin after a kick.
DROP POLICY IF EXISTS "Users can join room" ON public.room_participants;
CREATE POLICY "Users can join room" ON public.room_participants
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
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
        AND NOT EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id
              AND rp.user_id = auth.uid()
              AND rp.status = 'kicked'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM public.listening_rooms r
            JOIN public.friendships f
              ON f.status = 'blocked'
             AND f.blocked_by = r.host_id
            WHERE r.id = room_participants.room_id
              AND f.user_id_1 = LEAST(r.host_id, auth.uid())
              AND f.user_id_2 = GREATEST(r.host_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users or host can update participant state" ON public.room_participants;
CREATE POLICY "Users or host can update participant state" ON public.room_participants
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND status <> 'kicked')
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id
              AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
    )
    WITH CHECK (
        (
            auth.uid() = user_id
            AND status <> 'kicked'
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
              AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
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
        AND EXISTS (
            SELECT 1
            FROM public.listening_rooms r
            WHERE topic = 'room:' || r.room_code
              AND (
                    r.host_id = auth.uid()
                    OR auth.uid() = ANY(r.co_host_ids)
                    OR EXISTS (
                        SELECT 1
                        FROM public.room_participants rp
                        WHERE rp.room_id = r.id
                          AND rp.user_id = auth.uid()
                          AND rp.status IN ('joined', 'reconnecting', 'muted')
                    )
              )
        )
    );

DROP POLICY IF EXISTS "VibeOn room members can send private room messages" ON realtime.messages;
CREATE POLICY "VibeOn room members can send private room messages"
    ON realtime.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        topic LIKE 'room:%'
        AND extension IN ('broadcast', 'presence')
        AND EXISTS (
            SELECT 1
            FROM public.listening_rooms r
            WHERE topic = 'room:' || r.room_code
              AND (
                    r.host_id = auth.uid()
                    OR auth.uid() = ANY(r.co_host_ids)
                    OR EXISTS (
                        SELECT 1
                        FROM public.room_participants rp
                        WHERE rp.room_id = r.id
                          AND rp.user_id = auth.uid()
                          AND rp.status IN ('joined', 'reconnecting', 'muted')
                    )
              )
        )
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
        OR EXISTS (
            SELECT 1
            FROM public.listening_rooms r
            WHERE topic = 'room:' || r.room_code
              AND r.host_id = auth.uid()
        )
    );

CREATE OR REPLACE FUNCTION public.get_room_participant_status(target_room_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $
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
$;

REVOKE ALL ON FUNCTION public.get_room_participant_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_room_participant_status(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_room_participant(
    target_room_code TEXT,
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

    IF moderation_action <> 'kick' THEN
        RAISE EXCEPTION 'Unsupported moderation action';
    END IF;

    IF target_user_id IS NULL OR target_user_id = caller_id THEN
        RAISE EXCEPTION 'Invalid moderation target';
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
        RAISE EXCEPTION 'Only the host or an authorized co-host can moderate this room';
    END IF;

    IF target_user_id = room_row.host_id THEN
        RAISE EXCEPTION 'The room host cannot be kicked';
    END IF;

    UPDATE public.room_participants
    SET status = 'kicked',
        last_ping = NOW()
    WHERE room_id = room_row.id
      AND user_id = target_user_id
      AND status <> 'kicked';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Participant is not currently in this room'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'room_code', room_row.room_code,
        'target_user_id', target_user_id,
        'action', 'kick'
    );
END;
$$;

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

REVOKE ALL ON FUNCTION public.moderate_room_participant(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_room_chat_muted(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_room_participant(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_room_chat_muted(TEXT, BOOLEAN) TO authenticated;
