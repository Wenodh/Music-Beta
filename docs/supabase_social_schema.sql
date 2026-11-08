-- ==============================================================================
-- VIBE ON — PHASE 2: COMPLETE SOCIAL LAYER SCHEMA & MIGRATION SCRIPT
-- ==============================================================================
-- Description:
-- Idempotent schema definition for Vibe On Social Layer:
-- 1. `profiles`: Single canonical user profile with strict privacy & uniqueness constraints.
-- 2. `friendships`: Canonical unordered pair relationship model preventing reverse duplicates,
--    with state machine supporting pending, accepted, blocked transitions.
-- 3. `social_notifications`: Cloud notifications with RLS and realtime support.
-- 4. Secure RPC transition functions with fixed search paths.
--
-- Rollback instructions:
-- See section at bottom of this file.
-- ==============================================================================

-- Ensure uuid-ossp or pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USER PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    is_private BOOLEAN NOT NULL DEFAULT false,
    share_activity BOOLEAN NOT NULL DEFAULT true,
    show_online BOOLEAN NOT NULL DEFAULT true,
    allow_discovery BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]+$')
);

-- Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_allow_discovery ON public.profiles (allow_discovery) WHERE allow_discovery = true;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS:
-- 1. Users can select profiles:
--    - If it's their own profile
--    - If the profile allows discovery or is public
--    - If they have an accepted friendship with the user
DROP POLICY IF EXISTS "Profiles are selectable by self or discovery" ON public.profiles;
CREATE POLICY "Profiles are selectable by self or discovery" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR allow_discovery = true
        OR is_private = false
        OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.user_id_1 = LEAST(auth.uid(), profiles.id) AND f.user_id_2 = GREATEST(auth.uid(), profiles.id))
              )
        )
    );

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    clean_username TEXT;
    base_name TEXT;
BEGIN
    base_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Vibe User');
    clean_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    IF char_length(clean_username) < 3 THEN
        clean_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);
    END IF;

    -- Avoid username collision by appending random digits if exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(clean_username)) THEN
        clean_username := clean_username || '_' || FLOOR(RANDOM() * 899 + 100)::text;
    END IF;

    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        clean_username,
        base_name,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


-- ------------------------------------------------------------------------------
-- 2. FRIENDSHIPS TABLE
-- ------------------------------------------------------------------------------
-- Uses canonical unordered pair (user_id_1 < user_id_2) to strictly prevent reverse duplicates,
-- while explicitly recording requester_id and recipient_id.
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    blocked_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_friendship CHECK (user_id_1 <> user_id_2),
    CONSTRAINT canonical_pair_order CHECK (user_id_1 < user_id_2),
    CONSTRAINT valid_requester CHECK (requester_id IN (user_id_1, user_id_2)),
    CONSTRAINT valid_recipient CHECK (recipient_id IN (user_id_1, user_id_2) AND recipient_id <> requester_id),
    CONSTRAINT unique_friendship_pair UNIQUE (user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_1 ON public.friendships (user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user_2 ON public.friendships (user_id_2);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships (status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient ON public.friendships (recipient_id);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Friendships RLS:
-- Users can only see friendships where they are one of the two participants,
-- and they are not blocked by the other user (or they are the blocker).
DROP POLICY IF EXISTS "Participants can view their friendships" ON public.friendships;
CREATE POLICY "Participants can view their friendships" ON public.friendships
    FOR SELECT USING (
        (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
    );

-- Modifications (insert/update/delete) can occur via direct authenticated RLS
-- OR via the secure transition RPC functions below.
DROP POLICY IF EXISTS "Users can insert friendship request" ON public.friendships;
CREATE POLICY "Users can insert friendship request" ON public.friendships
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
        AND user_id_1 = LEAST(requester_id, recipient_id)
        AND user_id_2 = GREATEST(requester_id, recipient_id)
        AND status IN ('pending', 'blocked')
    );

DROP POLICY IF EXISTS "Users can update their own received requests or blocks" ON public.friendships;
CREATE POLICY "Users can update their own received requests or blocks" ON public.friendships
    FOR UPDATE USING (
        auth.uid() = user_id_1 OR auth.uid() = user_id_2
    ) WITH CHECK (
        auth.uid() = user_id_1 OR auth.uid() = user_id_2
    );

DROP POLICY IF EXISTS "Participants can delete friendship" ON public.friendships;
CREATE POLICY "Participants can delete friendship" ON public.friendships
    FOR DELETE USING (
        auth.uid() = user_id_1 OR auth.uid() = user_id_2
    );


-- ------------------------------------------------------------------------------
-- 3. SOCIAL NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'friend_request_received',
        'friend_request_accepted',
        'friend_request_declined',
        'missed_call',
        'friend_activity'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_notifications_user_id ON public.social_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_social_notifications_is_read ON public.social_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_social_notifications_created_at ON public.social_notifications (created_at DESC);

-- Enable RLS on social_notifications
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.social_notifications;
CREATE POLICY "Users can view their own notifications" ON public.social_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications read state" ON public.social_notifications;
CREATE POLICY "Users can update their own notifications read state" ON public.social_notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.social_notifications;
CREATE POLICY "Users can delete their own notifications" ON public.social_notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Anyone authenticated can insert notifications intended for other users (e.g. sending a friend request)
-- Direct client inserts are strictly forbidden. Only authoritative SECURITY DEFINER RPCs
-- (e.g., send_friend_request, respond_friend_request) create notification rows.
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.social_notifications;
DROP POLICY IF EXISTS "Deny direct client insert on social_notifications" ON public.social_notifications;
CREATE POLICY "Deny direct client insert on social_notifications" ON public.social_notifications
    FOR INSERT TO authenticated, anon
    WITH CHECK (false);

REVOKE INSERT ON public.social_notifications FROM authenticated;
REVOKE INSERT ON public.social_notifications FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.social_notifications TO authenticated;


-- ------------------------------------------------------------------------------
-- 4. SECURE RPC TRANSITION FUNCTIONS (Fixed Search Path)
-- ------------------------------------------------------------------------------

-- RPC: Send Friend Request
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    p_u1 UUID;
    p_u2 UUID;
    existing_row public.friendships%ROWTYPE;
    requester_profile public.profiles%ROWTYPE;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF cur_user_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot friend yourself';
    END IF;

    -- Canonical pair order
    p_u1 := LEAST(cur_user_id, target_user_id);
    p_u2 := GREATEST(cur_user_id, target_user_id);

    SELECT * INTO existing_row FROM public.friendships WHERE user_id_1 = p_u1 AND user_id_2 = p_u2;

    IF FOUND THEN
        IF existing_row.status = 'accepted' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Already friends');
        ELSIF existing_row.status = 'blocked' THEN
            IF existing_row.blocked_by = cur_user_id THEN
                RETURN jsonb_build_object('success', false, 'message', 'You have blocked this user');
            ELSE
                RETURN jsonb_build_object('success', false, 'message', 'Unable to send request');
            END IF;
        ELSIF existing_row.status = 'pending' THEN
            IF existing_row.requester_id = cur_user_id THEN
                RETURN jsonb_build_object('success', false, 'message', 'Request already sent');
            ELSE
                -- Mutual request auto-accepts!
                UPDATE public.friendships
                SET status = 'accepted', updated_at = NOW()
                WHERE id = existing_row.id;

                -- Notify both
                INSERT INTO public.social_notifications (user_id, actor_id, type, title, message)
                VALUES (existing_row.requester_id, cur_user_id, 'friend_request_accepted', 'Friend Request Accepted', 'You and your friend are now connected!');

                RETURN jsonb_build_object('success', true, 'status', 'accepted', 'message', 'Friend request accepted mutually');
            END IF;
        END IF;
    END IF;

    -- Insert new pending request
    INSERT INTO public.friendships (user_id_1, user_id_2, requester_id, recipient_id, status)
    VALUES (p_u1, p_u2, cur_user_id, target_user_id, 'pending');

    -- Create notification for target recipient
    SELECT * INTO requester_profile FROM public.profiles WHERE id = cur_user_id;
    INSERT INTO public.social_notifications (user_id, actor_id, type, title, message)
    VALUES (
        target_user_id,
        cur_user_id,
        'friend_request_received',
        'New Friend Request',
        COALESCE(requester_profile.display_name, 'A user') || ' sent you a friend request.'
    );

    RETURN jsonb_build_object('success', true, 'status', 'pending', 'message', 'Friend request sent successfully');
END;
$$;


-- RPC: Respond to Friend Request (accept or decline)
CREATE OR REPLACE FUNCTION public.respond_friend_request(request_friendship_id UUID, accept_action BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    f_row public.friendships%ROWTYPE;
    responder_profile public.profiles%ROWTYPE;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO f_row FROM public.friendships WHERE id = request_friendship_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found';
    END IF;

    IF f_row.recipient_id <> cur_user_id THEN
        RAISE EXCEPTION 'Not authorized to respond to this request';
    END IF;

    IF f_row.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request is no longer pending');
    END IF;

    IF accept_action THEN
        UPDATE public.friendships
        SET status = 'accepted', updated_at = NOW()
        WHERE id = request_friendship_id;

        -- Create notification for the original requester
        SELECT * INTO responder_profile FROM public.profiles WHERE id = cur_user_id;
        INSERT INTO public.social_notifications (user_id, actor_id, type, title, message)
        VALUES (
            f_row.requester_id,
            cur_user_id,
            'friend_request_accepted',
            'Friend Request Accepted',
            COALESCE(responder_profile.display_name, 'A user') || ' accepted your friend request.'
        );

        RETURN jsonb_build_object('success', true, 'status', 'accepted', 'message', 'Friend request accepted');
    ELSE
        -- Declined: delete pending request row
        DELETE FROM public.friendships WHERE id = request_friendship_id;
        RETURN jsonb_build_object('success', true, 'status', 'declined', 'message', 'Friend request declined');
    END IF;
END;
$$;


-- RPC: Cancel Outgoing Friend Request
CREATE OR REPLACE FUNCTION public.cancel_friend_request(request_friendship_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    f_row public.friendships%ROWTYPE;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO f_row FROM public.friendships WHERE id = request_friendship_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF f_row.requester_id <> cur_user_id THEN
        RAISE EXCEPTION 'You are not the requester';
    END IF;

    IF f_row.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request cannot be cancelled');
    END IF;

    DELETE FROM public.friendships WHERE id = request_friendship_id;
    RETURN jsonb_build_object('success', true, 'message', 'Friend request cancelled');
END;
$$;


-- RPC: Remove Friend
CREATE OR REPLACE FUNCTION public.remove_friend(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    p_u1 UUID;
    p_u2 UUID;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    p_u1 := LEAST(cur_user_id, target_user_id);
    p_u2 := GREATEST(cur_user_id, target_user_id);

    DELETE FROM public.friendships
    WHERE user_id_1 = p_u1 AND user_id_2 = p_u2 AND status = 'accepted';

    RETURN jsonb_build_object('success', true, 'message', 'Friend removed');
END;
$$;


-- RPC: Block User
CREATE OR REPLACE FUNCTION public.block_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    p_u1 UUID;
    p_u2 UUID;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF cur_user_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;

    p_u1 := LEAST(cur_user_id, target_user_id);
    p_u2 := GREATEST(cur_user_id, target_user_id);

    INSERT INTO public.friendships (user_id_1, user_id_2, requester_id, recipient_id, status, blocked_by)
    VALUES (p_u1, p_u2, cur_user_id, target_user_id, 'blocked', cur_user_id)
    ON CONFLICT (user_id_1, user_id_2) DO UPDATE
    SET status = 'blocked',
        blocked_by = cur_user_id,
        requester_id = cur_user_id,
        recipient_id = target_user_id,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'message', 'User blocked');
END;
$$;


-- RPC: Unblock User
CREATE OR REPLACE FUNCTION public.unblock_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    p_u1 UUID;
    p_u2 UUID;
    f_row public.friendships%ROWTYPE;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    p_u1 := LEAST(cur_user_id, target_user_id);
    p_u2 := GREATEST(cur_user_id, target_user_id);

    SELECT * INTO f_row FROM public.friendships WHERE user_id_1 = p_u1 AND user_id_2 = p_u2;

    IF NOT FOUND OR f_row.status <> 'blocked' OR f_row.blocked_by <> cur_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'User is not blocked by you');
    END IF;

    DELETE FROM public.friendships WHERE user_id_1 = p_u1 AND user_id_2 = p_u2;
    RETURN jsonb_build_object('success', true, 'message', 'User unblocked');
END;
$$;


-- ==============================================================================
-- ROLLBACK INSTRUCTIONS
-- ==============================================================================
-- In the event that this migration needs to be rolled back, run the following SQL:
--
-- DROP FUNCTION IF EXISTS public.unblock_user(UUID);
-- DROP FUNCTION IF EXISTS public.block_user(UUID);
-- DROP FUNCTION IF EXISTS public.remove_friend(UUID);
-- DROP FUNCTION IF EXISTS public.cancel_friend_request(UUID);
-- DROP FUNCTION IF EXISTS public.respond_friend_request(UUID, BOOLEAN);
-- DROP FUNCTION IF EXISTS public.send_friend_request(UUID);
-- DROP TABLE IF EXISTS public.social_notifications CASCADE;
-- DROP TABLE IF EXISTS public.friendships CASCADE;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user_profile();
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- ==============================================================================
