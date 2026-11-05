-- Migration: 20261105000000_arcade_leaderboards.sql
-- Description: Unified arcade leaderboards schema, RLS policies, and anti-abuse score submission RPC

-- 1. Create arcade_leaderboards table
CREATE TABLE IF NOT EXISTS public.arcade_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    score NUMERIC NOT NULL,
    display_value TEXT NOT NULL,
    difficulty TEXT DEFAULT 'normal',
    mode TEXT DEFAULT 'standard',
    daily_seed TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for fast leaderboard querying and ranking
CREATE INDEX IF NOT EXISTS idx_arcade_leaderboard_game_score
    ON public.arcade_leaderboards(game_id, score, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arcade_leaderboard_user
    ON public.arcade_leaderboards(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_arcade_leaderboard_daily
    ON public.arcade_leaderboards(game_id, daily_seed, score);

-- 3. Enable RLS
ALTER TABLE public.arcade_leaderboards ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone can view leaderboards (including guests)
CREATE POLICY "Public read access for arcade leaderboards"
    ON public.arcade_leaderboards
    FOR SELECT
    USING (true);

-- Authenticated users can insert their own scores
CREATE POLICY "Users can insert their own arcade scores"
    ON public.arcade_leaderboards
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 5. Authorized Server-Side Score Submission RPC with Validation Boundary
CREATE OR REPLACE FUNCTION public.submit_arcade_score(
    p_game_id TEXT,
    p_metric_type TEXT,
    p_score NUMERIC,
    p_display_value TEXT,
    p_difficulty TEXT DEFAULT 'normal',
    p_mode TEXT DEFAULT 'standard',
    p_daily_seed TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_new_id UUID;
    v_valid_game BOOLEAN;
    v_lower_is_better BOOLEAN;
    v_existing_score NUMERIC;
    v_is_improvement BOOLEAN;
BEGIN
    -- 1. Validate caller authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User must be authenticated to submit scores' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate game_id against allowed catalog
    v_valid_game := p_game_id IN (
        'vibe-queens', 'beat-tango', 'music-pinpoint', 'crossclimb', 'vibe-word',
        '2048-beat', 'vibe-sudoku', 'sound-sweeper', 'picross-music', 'slide-puzzle',
        'ludo-mini', 'tic-tac-toe', 'connect-four', 'vibe-checkers', 'vibe-chess', 'carrom-disc',
        'singer-snake', 'flappy-star', 'vibe-runner', 'beat-breaker', 'cosmic-beats',
        'beat-drop', 'rhythm-tap', 'simon-beats', 'memory-flip', 'vibe-solitaire'
    );
    IF NOT v_valid_game THEN
        RAISE EXCEPTION 'Invalid game_id: %', p_game_id USING ERRCODE = '22023';
    END IF;

    -- 3. Validate metric_type and basic sanity bounds
    IF p_metric_type NOT IN ('points', 'time_ms', 'moves', 'streak') THEN
        RAISE EXCEPTION 'Invalid metric_type: %', p_metric_type USING ERRCODE = '22023';
    END IF;

    IF p_score < 0 THEN
        RAISE EXCEPTION 'Score cannot be negative' USING ERRCODE = '22023';
    END IF;

    -- Upper bound sanity check to prevent overflow/spam
    IF p_score > 1000000000 THEN
        RAISE EXCEPTION 'Score exceeds permissible bounds' USING ERRCODE = '22023';
    END IF;

    v_lower_is_better := (p_metric_type IN ('time_ms', 'moves'));

    -- 4. Check for existing best score for this user/game/mode/daily_seed to ensure idempotency & deduplication
    IF p_mode = 'daily' AND p_daily_seed IS NOT NULL THEN
        SELECT score INTO v_existing_score
        FROM public.arcade_leaderboards
        WHERE user_id = v_user_id
          AND game_id = p_game_id
          AND mode = 'daily'
          AND daily_seed = p_daily_seed
        ORDER BY (CASE WHEN v_lower_is_better THEN score END) ASC,
                 (CASE WHEN NOT v_lower_is_better THEN score END) DESC
        LIMIT 1;
    ELSE
        SELECT score INTO v_existing_score
        FROM public.arcade_leaderboards
        WHERE user_id = v_user_id
          AND game_id = p_game_id
          AND difficulty = coalesce(p_difficulty, 'normal')
        ORDER BY (CASE WHEN v_lower_is_better THEN score END) ASC,
                 (CASE WHEN NOT v_lower_is_better THEN score END) DESC
        LIMIT 1;
    END IF;

    -- 5. Determine if new score is an improvement
    IF v_existing_score IS NULL THEN
        v_is_improvement := TRUE;
    ELSIF v_lower_is_better THEN
        v_is_improvement := (p_score < v_existing_score);
    ELSE
        v_is_improvement := (p_score > v_existing_score);
    END IF;

    -- Insert new entry
    INSERT INTO public.arcade_leaderboards (
        user_id,
        game_id,
        metric_type,
        score,
        display_value,
        difficulty,
        mode,
        daily_seed,
        created_at
    )
    VALUES (
        v_user_id,
        p_game_id,
        p_metric_type,
        p_score,
        substring(coalesce(p_display_value, p_score::text) from 1 for 64),
        coalesce(p_difficulty, 'normal'),
        coalesce(p_mode, 'standard'),
        p_daily_seed,
        NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'id', v_new_id,
        'is_improvement', v_is_improvement,
        'score', p_score,
        'existing_best', v_existing_score
    );
END;
$$;
