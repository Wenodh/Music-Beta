-- SQL Schema for Syncing Settings
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON public.user_settings FOR DELETE
    USING (auth.uid() = user_id);


-- SQL Schema for Syncing Listening History
CREATE TABLE IF NOT EXISTS public.listening_history (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL,
    song_data JSONB NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, song_id)
);

-- Enable Row Level Security
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

-- Policies for Listening History
CREATE POLICY "Users can view their own history" ON public.listening_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON public.listening_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own history" ON public.listening_history
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.listening_history
    FOR DELETE USING (auth.uid() = user_id);
