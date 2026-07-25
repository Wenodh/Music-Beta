-- Vibe On - Supabase Database Schema
-- Use this schema to set up your Supabase project for Cloud Sync features.

-- 1. User Settings Table
-- Stores user preferences like theme, language, and equalizer settings.
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Favorites Table
-- Stores user's liked songs.
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, song_id)
);

-- Enable RLS for favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own favorites" ON public.favorites
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);


-- 3. Playlists Table
-- Stores user-created playlists.
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    songs_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playlists" ON public.playlists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own playlists" ON public.playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own playlists" ON public.playlists
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own playlists" ON public.playlists
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Realtime Setup
-- Enable Realtime for Group Sessions (Broadcasting)
-- Note: Realtime is enabled per table or via Channels.
-- Ensure "Realtime" is toggled ON in your Supabase Dashboard for the project.


-- 5. Listening History Table
-- Stores user's recently played/listening history songs.
CREATE TABLE IF NOT EXISTS public.listening_history (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_data JSONB NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, song_id)
);

-- Enable RLS for listening_history
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history" ON public.listening_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON public.listening_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own history" ON public.listening_history
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.listening_history
    FOR DELETE USING (auth.uid() = user_id);
