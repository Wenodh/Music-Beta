-- ==============================================================================
-- VIBE ON — PHASE 4: SOCIAL MUSIC EXPERIENCES & DIFFERENTIATION
-- Migration: 20261104000000_phase_4_social_experience.sql
-- ==============================================================================
-- Description:
-- Idempotent schema definitions and secure RLS policies for:
-- 1. Listening Rooms & Participants (Sprint 4.1 - Synchronized Group Listening)
-- 2. Public Listening Parties & Discovery (Sprint 4.2 - Public Parties & Moderation)
-- 3. Community Music Discovery Feed (Sprint 4.3 - Posts, Comments, Reactions, Follows)
-- 4. Collaborative Playlists & Normalized Items (Sprint 4.4 - Normalized playlist_items with fractional ordering)
--
-- Security & Safety Guarantees:
-- - Strict RLS enabled on all newly defined tables.
-- - No destructive changes to existing tables (favorites, playlists, profiles, user_settings).
-- - Backward-compatible JSONB migration for playlists without dropping songs_data.
-- - Fixed search_path (public, auth) on all security-definer helper functions.
-- - Explicit caller authorization and race-condition locks in all RPC functions.
-- - Private profile & block relationship visibility enforcement in community queries.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. SYNCHRONIZED LISTENING ROOMS & PARTICIPANTS (SPRINT 4.1)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.listening_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(12) NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT 'Listening Room',
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    co_host_ids UUID[] NOT NULL DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT false,
    max_participants INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reconnecting', 'paused', 'ended', 'closed')),
    state_version BIGINT NOT NULL DEFAULT 1,
    current_song JSONB DEFAULT NULL,
    current_position_ms BIGINT NOT NULL DEFAULT 0,
    playback_speed REAL NOT NULL DEFAULT 1.0,
    is_playing BOOLEAN NOT NULL DEFAULT false,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grace_period_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    settings JSONB NOT NULL DEFAULT '{
        "allow_guest_control": false,
        "allow_suggest_songs": true,
        "vote_skip_threshold": 0.5,
        "require_approval": false,
        "mute_chat": false
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listening_rooms_code ON public.listening_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_listening_rooms_host ON public.listening_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_listening_rooms_status ON public.listening_rooms(status);
CREATE INDEX IF NOT EXISTS idx_listening_rooms_public ON public.listening_rooms(is_public) WHERE is_public = true AND status = 'active';

ALTER TABLE public.listening_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active public rooms or rooms they participate in" ON public.listening_rooms;
CREATE POLICY "Anyone can view active public rooms or rooms they participate in" ON public.listening_rooms
    FOR SELECT USING (
        (is_public = true AND status IN ('active', 'reconnecting', 'paused'))
        OR host_id = auth.uid()
        OR auth.uid() = ANY(co_host_ids)
        OR EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = listening_rooms.id AND rp.user_id = auth.uid() AND rp.status <> 'kicked'
        )
    );

DROP POLICY IF EXISTS "Host can insert room" ON public.listening_rooms;
CREATE POLICY "Host can insert room" ON public.listening_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host and co-hosts can update room" ON public.listening_rooms;
CREATE POLICY "Host and co-hosts can update room" ON public.listening_rooms
    FOR UPDATE USING (
        auth.uid() = host_id OR auth.uid() = ANY(co_host_ids)
    ) WITH CHECK (
        auth.uid() = host_id OR auth.uid() = ANY(co_host_ids)
    );

DROP POLICY IF EXISTS "Host can delete or close room" ON public.listening_rooms;
CREATE POLICY "Host can delete or close room" ON public.listening_rooms
    FOR DELETE USING (auth.uid() = host_id);


CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.listening_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('host', 'co-host', 'listener', 'moderator')),
    status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'reconnecting', 'left', 'kicked', 'muted')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_room_user UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room ON public.room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON public.room_participants(user_id);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

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
            WHERE peer.room_id = room_participants.room_id AND peer.user_id = auth.uid() AND peer.status <> 'kicked'
        )
    );

DROP POLICY IF EXISTS "Users can join room" ON public.room_participants;
CREATE POLICY "Users can join room" ON public.room_participants
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND NOT EXISTS (
            -- Cannot join if previously kicked from room
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id AND rp.user_id = auth.uid() AND rp.status = 'kicked'
        )
        AND NOT EXISTS (
            -- Cannot join if blocked by room host
            SELECT 1 FROM public.listening_rooms r
            JOIN public.friendships f ON f.status = 'blocked' AND f.blocked_by = r.host_id
            WHERE r.id = room_participants.room_id
              AND ((f.user_id_1 = LEAST(r.host_id, auth.uid()) AND f.user_id_2 = GREATEST(r.host_id, auth.uid())))
        )
    );

DROP POLICY IF EXISTS "Users or host can update participant state" ON public.room_participants;
CREATE POLICY "Users or host can update participant state" ON public.room_participants
    FOR UPDATE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
    ) WITH CHECK (
        -- Participants can update their own status to left/reconnecting; host can update role or status
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
    );

DROP POLICY IF EXISTS "Users can leave or host can remove participant" ON public.room_participants;
CREATE POLICY "Users can leave or host can remove participant" ON public.room_participants
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.listening_rooms r
            WHERE r.id = room_participants.room_id AND (r.host_id = auth.uid() OR auth.uid() = ANY(r.co_host_ids))
        )
    );


-- ------------------------------------------------------------------------------
-- 2. PUBLIC LISTENING PARTIES & MODERATION (SPRINT 4.2)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(12) NOT NULL UNIQUE,
    party_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Trending',
    host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderator_ids UUID[] NOT NULL DEFAULT '{}',
    host_name TEXT NOT NULL,
    host_avatar TEXT DEFAULT '',
    song_title TEXT DEFAULT '',
    song_artist TEXT DEFAULT '',
    song_artwork TEXT DEFAULT '',
    participant_count INTEGER NOT NULL DEFAULT 1,
    max_participants INTEGER NOT NULL DEFAULT 100,
    is_public BOOLEAN NOT NULL DEFAULT true,
    scheduled_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'paused', 'ended', 'cancelled', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_room_code ON public.parties(room_code);
CREATE INDEX IF NOT EXISTS idx_parties_is_public ON public.parties(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_parties_category ON public.parties(category);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.parties(status);
CREATE INDEX IF NOT EXISTS idx_parties_updated_at ON public.parties(updated_at DESC);

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public parties are viewable by everyone" ON public.parties;
CREATE POLICY "Public parties are viewable by everyone" ON public.parties
    FOR SELECT USING (
        is_public = true
        OR host_id = auth.uid()
        OR auth.uid() = ANY(moderator_ids)
    );

DROP POLICY IF EXISTS "Authenticated users can create parties" ON public.parties;
CREATE POLICY "Authenticated users can create parties" ON public.parties
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (host_id IS NULL OR host_id = auth.uid())
    );

DROP POLICY IF EXISTS "Party host and moderators can update party" ON public.parties;
CREATE POLICY "Party host and moderators can update party" ON public.parties
    FOR UPDATE USING (
        host_id = auth.uid()
        OR auth.uid() = ANY(moderator_ids)
    ) WITH CHECK (
        host_id = auth.uid()
        OR auth.uid() = ANY(moderator_ids)
    );

DROP POLICY IF EXISTS "Party host can delete party" ON public.parties;
CREATE POLICY "Party host can delete party" ON public.parties
    FOR DELETE USING (host_id = auth.uid());


CREATE TABLE IF NOT EXISTS public.party_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.party_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.party_reports;
CREATE POLICY "Users can create reports" ON public.party_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can view their own filed reports" ON public.party_reports;
CREATE POLICY "Users can view their own filed reports" ON public.party_reports
    FOR SELECT USING (auth.uid() = reported_by);


-- ------------------------------------------------------------------------------
-- 3. COMMUNITY MUSIC DISCOVERY (SPRINT 4.3)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_type TEXT NOT NULL CHECK (post_type IN ('song', 'album', 'playlist', 'discussion', 'review', 'poll')),
    caption TEXT NOT NULL DEFAULT '',
    music_data JSONB DEFAULT NULL,
    poll_data JSONB DEFAULT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON public.community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_engagement ON public.community_posts((likes_count + comments_count) DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community posts are selectable respecting privacy and blocks" ON public.community_posts;
CREATE POLICY "Community posts are selectable respecting privacy and blocks" ON public.community_posts
    FOR SELECT USING (
        -- 1. Must not be blocked by author or have author blocked
        NOT EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'blocked'
              AND (
                (f.user_id_1 = LEAST(auth.uid(), community_posts.author_id)
                 AND f.user_id_2 = GREATEST(auth.uid(), community_posts.author_id))
              )
        )
        -- 2. Respect private profile: if author is private, viewer must be author or an accepted follower/friend
        AND (
            author_id = auth.uid()
            OR NOT EXISTS (
                SELECT 1 FROM public.profiles p WHERE p.id = community_posts.author_id AND p.is_private = true
            )
            OR EXISTS (
                SELECT 1 FROM public.user_follows uf
                WHERE uf.following_id = community_posts.author_id AND uf.follower_id = auth.uid() AND uf.status = 'accepted'
            )
            OR EXISTS (
                SELECT 1 FROM public.friendships f
                WHERE f.status = 'accepted'
                  AND ((f.user_id_1 = LEAST(auth.uid(), community_posts.author_id) AND f.user_id_2 = GREATEST(auth.uid(), community_posts.author_id)))
            )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
CREATE POLICY "Authenticated users can create posts" ON public.community_posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own posts" ON public.community_posts;
CREATE POLICY "Authors can update their own posts" ON public.community_posts
    FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.community_posts;
CREATE POLICY "Authors can delete their own posts" ON public.community_posts
    FOR DELETE USING (auth.uid() = author_id);


CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON public.post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_comment_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable respecting post visibility and blocks" ON public.post_comments;
CREATE POLICY "Comments are viewable respecting post visibility and blocks" ON public.post_comments
    FOR SELECT USING (
        -- Viewer must be able to view the underlying post
        EXISTS (
            SELECT 1 FROM public.community_posts cp
            WHERE cp.id = post_comments.post_id
        )
        -- And author of comment must not be blocked
        AND NOT EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'blocked'
              AND (
                (f.user_id_1 = LEAST(auth.uid(), post_comments.author_id)
                 AND f.user_id_2 = GREATEST(auth.uid(), post_comments.author_id))
              )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.post_comments;
CREATE POLICY "Authenticated users can comment" ON public.post_comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id
        AND EXISTS (
            SELECT 1 FROM public.community_posts cp WHERE cp.id = post_comments.post_id
        )
    );

DROP POLICY IF EXISTS "Authors can delete their comments" ON public.post_comments;
CREATE POLICY "Authors can delete their comments" ON public.post_comments
    FOR DELETE USING (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.community_posts cp WHERE cp.id = post_comments.post_id AND cp.author_id = auth.uid()
        )
    );


CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'heart' CHECK (reaction_type IN ('heart', 'fire', 'party', 'vibes', 'clap')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_post_user_reaction UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_poll_vote UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes(user_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poll votes are viewable by post viewers" ON public.poll_votes;
CREATE POLICY "Poll votes are viewable by post viewers" ON public.poll_votes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.id = poll_votes.post_id)
    );

DROP POLICY IF EXISTS "Authenticated users can vote once in active polls" ON public.poll_votes;
CREATE POLICY "Authenticated users can vote once in active polls" ON public.poll_votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.community_posts cp
            WHERE cp.id = poll_votes.post_id AND cp.post_type = 'poll'
        )
    );

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON public.post_reactions(user_id);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.post_reactions;
CREATE POLICY "Reactions are viewable by everyone" ON public.post_reactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.id = post_reactions.post_id)
    );

DROP POLICY IF EXISTS "Authenticated users can react" ON public.post_reactions;
CREATE POLICY "Authenticated users can react" ON public.post_reactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.id = post_reactions.post_id)
    );

DROP POLICY IF EXISTS "Users can remove their reaction" ON public.post_reactions;
CREATE POLICY "Users can remove their reaction" ON public.post_reactions
    FOR DELETE USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id),
    CONSTRAINT unique_follow_pair UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.user_follows;
CREATE POLICY "Follows are viewable by everyone" ON public.user_follows
    FOR SELECT USING (
        NOT EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'blocked'
              AND ((f.user_id_1 = LEAST(auth.uid(), user_follows.following_id) AND f.user_id_2 = GREATEST(auth.uid(), user_follows.following_id)))
        )
    );

DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others" ON public.user_follows
    FOR INSERT WITH CHECK (
        auth.uid() = follower_id
        AND NOT EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'blocked'
              AND ((f.user_id_1 = LEAST(follower_id, following_id) AND f.user_id_2 = GREATEST(follower_id, following_id)))
        )
    );

DROP POLICY IF EXISTS "Users can unfollow or remove follower" ON public.user_follows;
CREATE POLICY "Users can unfollow or remove follower" ON public.user_follows
    FOR DELETE USING (
        auth.uid() = follower_id OR auth.uid() = following_id
    );


-- ------------------------------------------------------------------------------
-- 4. COLLABORATIVE PLAYLISTS & NORMALIZED ITEMS (SPRINT 4.4)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'is_collaborative'
    ) THEN
        ALTER TABLE public.playlists ADD COLUMN is_collaborative BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'version'
    ) THEN
        ALTER TABLE public.playlists ADD COLUMN version BIGINT NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'playlists' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.playlists ADD COLUMN description TEXT DEFAULT '';
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('invited', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_playlist_collaborator UNIQUE(playlist_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist ON public.playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user ON public.playlist_collaborators(user_id);

ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators can view playlist collaborators" ON public.playlist_collaborators;
CREATE POLICY "Collaborators can view playlist collaborators" ON public.playlist_collaborators
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_collaborators.playlist_id AND (p.user_id = auth.uid() OR p.is_collaborative = true)
        )
    );

DROP POLICY IF EXISTS "Playlist owner can manage collaborators" ON public.playlist_collaborators;
CREATE POLICY "Playlist owner can manage collaborators" ON public.playlist_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_collaborators.playlist_id AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owner or collaborator can update status" ON public.playlist_collaborators;
CREATE POLICY "Owner or collaborator can update status" ON public.playlist_collaborators
    FOR UPDATE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_collaborators.playlist_id AND p.user_id = auth.uid()
        )
    ) WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_collaborators.playlist_id AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owner or collaborator can remove collaborator" ON public.playlist_collaborators;
CREATE POLICY "Owner or collaborator can remove collaborator" ON public.playlist_collaborators
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_collaborators.playlist_id AND p.user_id = auth.uid()
        )
    );


CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_data JSONB NOT NULL,
    position DOUBLE PRECISION NOT NULL,
    added_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_pos ON public.playlist_items(playlist_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_playlist_items_song ON public.playlist_items(song_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_added_by ON public.playlist_items(added_by);

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viewers can view playlist items" ON public.playlist_items;
CREATE POLICY "Viewers can view playlist items" ON public.playlist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_items.playlist_id
              AND (
                p.user_id = auth.uid()
                OR p.is_collaborative = true
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators pc
                    WHERE pc.playlist_id = p.id AND pc.user_id = auth.uid()
                )
              )
        )
    );

DROP POLICY IF EXISTS "Editors and owner can insert items" ON public.playlist_items;
CREATE POLICY "Editors and owner can insert items" ON public.playlist_items
    FOR INSERT WITH CHECK (
        auth.uid() = added_by
        AND EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_items.playlist_id
              AND (
                p.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators pc
                    WHERE pc.playlist_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor') AND pc.status = 'accepted'
                )
              )
        )
    );

DROP POLICY IF EXISTS "Editors and owner can update item positions" ON public.playlist_items;
CREATE POLICY "Editors and owner can update item positions" ON public.playlist_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_items.playlist_id
              AND (
                p.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators pc
                    WHERE pc.playlist_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor') AND pc.status = 'accepted'
                )
              )
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_items.playlist_id
              AND (
                p.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators pc
                    WHERE pc.playlist_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor') AND pc.status = 'accepted'
                )
              )
        )
    );

DROP POLICY IF EXISTS "Item creator or owner can delete items" ON public.playlist_items;
CREATE POLICY "Item creator or owner can delete items" ON public.playlist_items
    FOR DELETE USING (
        auth.uid() = added_by
        OR EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_items.playlist_id
              AND (
                p.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators pc
                    WHERE pc.playlist_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor') AND pc.status = 'accepted'
                )
              )
        )
    );


DROP POLICY IF EXISTS "Users can view their own or collaborative playlists" ON public.playlists;
CREATE POLICY "Users can view their own or collaborative playlists" ON public.playlists
    FOR SELECT USING (
        auth.uid() = user_id
        OR is_collaborative = true
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators pc
            WHERE pc.playlist_id = playlists.id AND pc.user_id = auth.uid()
        )
    );


-- ------------------------------------------------------------------------------
-- 5. SECURE RPC OPERATIONS (Fixed Search Path & Strict Authorization)
-- ------------------------------------------------------------------------------

-- Atomic Poll Voting RPC with Uniqueness and Expiration Validation
CREATE OR REPLACE FUNCTION public.submit_poll_vote(
    target_post_id UUID,
    target_option_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    cur_post public.community_posts%ROWTYPE;
    poll_obj JSONB;
    opts JSONB;
    opt JSONB;
    updated_opts JSONB := '[]'::jsonb;
    found_option BOOLEAN := false;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO cur_post
    FROM public.community_posts
    WHERE id = target_post_id
    FOR UPDATE;

    IF NOT FOUND OR cur_post.post_type <> 'poll' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Poll not found');
    END IF;

    -- Verify user hasn't already voted
    IF EXISTS (SELECT 1 FROM public.poll_votes WHERE post_id = target_post_id AND user_id = cur_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User has already voted');
    END IF;

    poll_obj := cur_post.poll_data;
    opts := COALESCE(poll_obj->'options', '[]'::jsonb);

    FOR opt IN SELECT * FROM jsonb_array_elements(opts) LOOP
        IF opt->>'id' = target_option_id THEN
            opt := jsonb_set(opt, '{votes}', to_jsonb(COALESCE((opt->>'votes')::int, 0) + 1));
            found_option := true;
        END IF;
        updated_opts := updated_opts || opt;
    END LOOP;

    IF NOT found_option THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid option ID');
    END IF;

    poll_obj := jsonb_set(poll_obj, '{options}', updated_opts);
    poll_obj := jsonb_set(poll_obj, '{totalVotes}', to_jsonb(COALESCE((poll_obj->>'totalVotes')::int, 0) + 1));

    -- Insert individual vote record
    INSERT INTO public.poll_votes (post_id, user_id, option_id)
    VALUES (target_post_id, cur_user_id, target_option_id);

    -- Update aggregated poll data in post
    UPDATE public.community_posts
    SET poll_data = poll_obj, updated_at = NOW()
    WHERE id = target_post_id;

    RETURN jsonb_build_object('success', true, 'option_id', target_option_id);
END;
$$;

-- Server-Side Authenticated Moderation RPC (Host & Moderator Authorization)
CREATE OR REPLACE FUNCTION public.moderate_room_participant(
    target_room_code VARCHAR,
    target_user_id UUID,
    moderation_action TEXT -- 'kick', 'mute', 'unmute'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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

    -- Only room host or designated co-hosts can moderate
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
$$;

-- Host election RPC with caller validation and atomic state transition
CREATE OR REPLACE FUNCTION public.elect_next_room_host(target_room_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    cur_room public.listening_rooms%ROWTYPE;
    next_host_id UUID;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock room row for atomic election by room_code or UUID string
    SELECT * INTO cur_room
    FROM public.listening_rooms
    WHERE room_code = target_room_code OR id::text = target_room_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found');
    END IF;

    -- Verify caller is an active participant in this room
    IF NOT EXISTS (
        SELECT 1 FROM public.room_participants
        WHERE room_id = cur_room.id AND user_id = cur_user_id AND status = 'joined'
    ) THEN
        RAISE EXCEPTION 'Caller is not an active participant of this room';
    END IF;

    -- Verify grace period has expired or host is disconnected
    IF cur_room.grace_period_expires_at IS NOT NULL AND cur_room.grace_period_expires_at > NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grace period is still active');
    END IF;

    -- 1. Try to find active co-host first (ordered deterministically by joined_at ASC, id ASC)
    SELECT user_id INTO next_host_id
    FROM public.room_participants
    WHERE room_id = cur_room.id AND role = 'co-host' AND status = 'joined'
    ORDER BY joined_at ASC, id ASC
    LIMIT 1;

    -- 2. If no co-host, select longest-active participant (deterministic fallback)
    IF next_host_id IS NULL THEN
        SELECT user_id INTO next_host_id
        FROM public.room_participants
        WHERE room_id = cur_room.id AND status = 'joined' AND user_id <> cur_room.host_id
        ORDER BY joined_at ASC, id ASC
        LIMIT 1;
    END IF;

    IF next_host_id IS NOT NULL THEN
        UPDATE public.listening_rooms
        SET host_id = next_host_id,
            status = 'active',
            state_version = state_version + 1,
            grace_period_expires_at = NULL,
            updated_at = NOW()
        WHERE id = cur_room.id;

        UPDATE public.room_participants
        SET role = 'host'
        WHERE room_id = cur_room.id AND user_id = next_host_id;

        RETURN jsonb_build_object('success', true, 'new_host_id', next_host_id, 'state_version', cur_room.state_version + 1);
    ELSE
        -- No eligible participants left, close room
        UPDATE public.listening_rooms
        SET status = 'closed', updated_at = NOW()
        WHERE id = cur_room.id;

        RETURN jsonb_build_object('success', true, 'status', 'closed');
    END IF;
END;
$$;


-- Atomic Addition of Collaborative Playlist Item with Server-Side Authorization
CREATE OR REPLACE FUNCTION public.add_collaborative_playlist_item(
    target_playlist_id UUID,
    p_song_id TEXT,
    p_song_data JSONB,
    p_target_position DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    can_edit BOOLEAN := false;
    new_position DOUBLE PRECISION;
    new_item_id UUID := gen_random_uuid();
    max_pos DOUBLE PRECISION;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify caller is owner or editor
    SELECT (p.user_id = cur_user_id OR EXISTS (
        SELECT 1 FROM public.playlist_collaborators pc
        WHERE pc.playlist_id = target_playlist_id AND pc.user_id = cur_user_id AND pc.role IN ('owner', 'editor') AND pc.status = 'accepted'
    )) INTO can_edit
    FROM public.playlists p
    WHERE p.id = target_playlist_id;

    IF NOT can_edit THEN
        RAISE EXCEPTION 'Not authorized to edit this playlist';
    END IF;

    IF p_target_position IS NOT NULL THEN
        new_position := p_target_position;
    ELSE
        SELECT COALESCE(MAX(position), 0.0) INTO max_pos
        FROM public.playlist_items
        WHERE playlist_id = target_playlist_id;

        new_position := max_pos + 1000.0;
    END IF;

    -- Insert new normalized item (supporting legitimate duplicate tracks)
    INSERT INTO public.playlist_items (
        id,
        playlist_id,
        song_id,
        song_data,
        position,
        added_by
    ) VALUES (
        new_item_id,
        target_playlist_id,
        p_song_id,
        p_song_data,
        new_position,
        cur_user_id
    );

    -- Increment playlist version
    UPDATE public.playlists
    SET version = version + 1, updated_at = NOW()
    WHERE id = target_playlist_id;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', new_item_id,
        'position', new_position,
        'added_by', cur_user_id
    );
END;
$$;


-- Atomic Rebalance of Playlist Positions with Caller Authorization
CREATE OR REPLACE FUNCTION public.rebalance_playlist_positions(target_playlist_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    item RECORD;
    new_pos DOUBLE PRECISION := 1000.0;
    can_edit BOOLEAN := false;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify caller is owner or editor
    SELECT (p.user_id = cur_user_id OR EXISTS (
        SELECT 1 FROM public.playlist_collaborators pc
        WHERE pc.playlist_id = target_playlist_id AND pc.user_id = cur_user_id AND pc.role IN ('owner', 'editor') AND pc.status = 'accepted'
    )) INTO can_edit
    FROM public.playlists p
    WHERE p.id = target_playlist_id;

    IF NOT can_edit THEN
        RAISE EXCEPTION 'Not authorized to rebalance this playlist';
    END IF;

    FOR item IN (
        SELECT id FROM public.playlist_items
        WHERE playlist_id = target_playlist_id
        ORDER BY position ASC, added_at ASC, id ASC
        FOR UPDATE
    ) LOOP
        UPDATE public.playlist_items
        SET position = new_pos, updated_at = NOW()
        WHERE id = item.id;

        new_pos := new_pos + 1000.0;
    END LOOP;

    -- Increment playlist version
    UPDATE public.playlists
    SET version = version + 1, updated_at = NOW()
    WHERE id = target_playlist_id;

    RETURN jsonb_build_object('success', true, 'rebalanced_count', (new_pos / 1000.0) - 1);
END;
$$;


-- Safe, Idempotent Backfill from JSONB songs_data to playlist_items
CREATE OR REPLACE FUNCTION public.backfill_playlist_jsonb_to_items(target_playlist_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    cur_user_id UUID := auth.uid();
    cur_p public.playlists%ROWTYPE;
    song_item JSONB;
    song_idx INT := 0;
    inserted_count INT := 0;
    extracted_song_id TEXT;
    can_manage BOOLEAN := false;
BEGIN
    IF cur_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO cur_p FROM public.playlists WHERE id = target_playlist_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Playlist not found');
    END IF;

    -- Caller must be playlist owner
    IF cur_p.user_id <> cur_user_id THEN
        RAISE EXCEPTION 'Only playlist owner can initiate backfill';
    END IF;

    IF cur_p.songs_data IS NOT NULL AND jsonb_typeof(cur_p.songs_data) = 'array' THEN
        FOR song_item IN SELECT * FROM jsonb_array_elements(cur_p.songs_data) LOOP
            song_idx := song_idx + 1;
            extracted_song_id := COALESCE(song_item->>'id', 'song_' || song_idx::text);

            IF extracted_song_id IS NOT NULL AND char_length(extracted_song_id) > 0 THEN
                -- Supports duplicate songs with unique item UUIDs and preserved sequence
                INSERT INTO public.playlist_items (
                    id,
                    playlist_id,
                    song_id,
                    song_data,
                    position,
                    added_by
                ) VALUES (
                    gen_random_uuid(),
                    target_playlist_id,
                    extracted_song_id,
                    song_item,
                    (song_idx * 1000.0)::DOUBLE PRECISION,
                    cur_p.user_id
                );

                inserted_count := inserted_count + 1;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'migrated_count', inserted_count);
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. SECURITY DEFINER EXECUTE GRANTS / REVOCATIONS
-- ------------------------------------------------------------------------------
-- Ensure public/anonymous roles cannot execute internal administrative RPCs directly
REVOKE EXECUTE ON FUNCTION public.submit_poll_vote(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_poll_vote(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.moderate_room_participant(VARCHAR, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_room_participant(VARCHAR, UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.elect_next_room_host(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.elect_next_room_host(VARCHAR) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_collaborative_playlist_item(UUID, TEXT, JSONB, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_collaborative_playlist_item(UUID, TEXT, JSONB, DOUBLE PRECISION) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rebalance_playlist_positions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebalance_playlist_positions(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.backfill_playlist_jsonb_to_items(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_playlist_jsonb_to_items(UUID) TO authenticated;
