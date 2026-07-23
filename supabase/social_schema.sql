-- Vibe On Phase 7: Social & Community Schema

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    favorite_genres TEXT[],
    listening_stats JSONB DEFAULT '{}'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "profile": "private",
        "activity": "private",
        "listening": "private",
        "favorites": "private",
        "playlists": "private",
        "followers": "visible",
        "following": "visible"
    }'::jsonb,
    badges TEXT[] DEFAULT '{}',
    is_onboarded BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for username search
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

-- Follows Table (Scalable Social Graph)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows (following_id);

-- Activity Feed Table
CREATE TABLE IF NOT EXISTS public.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'playlist_shared', 'follow', 'milestone', 'recommendation', 'podcast_new'
    payload JSONB NOT NULL,
    visibility TEXT DEFAULT 'followers', -- 'public', 'followers', 'private'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_user_id_idx ON public.activity (user_id);
CREATE INDEX IF NOT EXISTS activity_created_at_idx ON public.activity (created_at DESC);

-- Collaborative Playlists Table
CREATE TABLE IF NOT EXISTS public.collaborative_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    artwork_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Playlist Members (Roles)
CREATE TABLE IF NOT EXISTS public.playlist_members (
    playlist_id UUID REFERENCES public.collaborative_playlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (playlist_id, user_id)
);

-- Playlist Operations (Conflict Resolution)
CREATE TABLE IF NOT EXISTS public.playlist_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES public.collaborative_playlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    op_type TEXT NOT NULL, -- 'add', 'remove', 'move', 'rename'
    payload JSONB NOT NULL,
    sequence_number BIGSERIAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS playlist_ops_playlist_id_idx ON public.playlist_operations (playlist_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),
    type TEXT NOT NULL, -- 'new_follower', 'playlist_invite', 'playlist_update', 'recommendation'
    payload JSONB NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Basic Policies (To be refined)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (privacy_settings->>'profile' = 'visible' OR auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Follows are viewable if following allows" ON public.follows
    FOR SELECT USING (TRUE); -- More complex logic based on profile privacy needed

CREATE POLICY "Users can follow/unfollow" ON public.follows
    FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Activity viewable by followers/public" ON public.activity
    FOR SELECT USING (
        visibility = 'public' OR
        (visibility = 'followers' AND EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = user_id)) OR
        auth.uid() = user_id
    );

CREATE POLICY "Users can create activity" ON public.activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);
