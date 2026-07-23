-- Migrations for Phase 5: Offline Downloads & Cloud Synchronization

-- Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    media_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    content_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1 NOT NULL,
    device_id UUID NOT NULL,
    UNIQUE(user_id, provider, media_id)
);

-- History Table
CREATE TABLE IF NOT EXISTS public.history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    media_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    content_type TEXT NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    listened_duration INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1 NOT NULL,
    device_id UUID NOT NULL
);

-- Playback Positions Table
CREATE TABLE IF NOT EXISTS public.playback_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    media_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    position FLOAT DEFAULT 0 NOT NULL,
    duration FLOAT DEFAULT 0 NOT NULL,
    playback_speed FLOAT DEFAULT 1.0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    device_id UUID NOT NULL,
    UNIQUE(user_id, provider, media_id)
);

-- Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    media_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    chapter_id TEXT,
    position FLOAT NOT NULL,
    title TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1 NOT NULL,
    device_id UUID NOT NULL
);

-- Downloads Metadata Table (Syncing which devices have what downloaded)
CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    media_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    content_type TEXT NOT NULL,
    device_id UUID NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, device_id, provider, media_id)
);

-- Enable RLS for all tables
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Simplified: Users can only see/edit their own data)
CREATE POLICY "Users can manage their own favorites" ON public.favorites USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own history" ON public.history USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own playback positions" ON public.playback_positions USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookmarks" ON public.bookmarks USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own downloads" ON public.downloads USING (auth.uid() = user_id);

-- Updated At triggers (optional but good practice)
-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_favorites_updated_at BEFORE UPDATE ON public.favorites FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_history_updated_at BEFORE UPDATE ON public.history FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_playback_positions_updated_at BEFORE UPDATE ON public.playback_positions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON public.bookmarks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_downloads_updated_at BEFORE UPDATE ON public.downloads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
