-- ==============================================================================
-- VIBE ON — PHASE 4: SOCIAL MUSIC EXPERIENCES & DIFFERENTIATION
-- Rollback Script: 20261104000000_phase_4_social_experience_rollback.sql
-- ==============================================================================
-- Description:
-- Idempotent rollback script for Phase 4 database objects.
--
-- Safety & Data Preservation Guarantee:
-- 1. Before dropping public.playlist_items, synchronizes any new or reordered
--    items back into public.playlists.songs_data so no collaborated items
--    added during Phase 4 are destroyed or lost upon rollback.
-- 2. Safely drops newly defined tables, indexes, and RPC functions.
-- 3. Restores original single-user Playlists RLS policy.
-- 4. Preserves all legacy user data in playlists, favorites, profiles, and settings.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. DATA PRESERVATION: RE-SERIALIZE PLAYLIST ITEMS INTO SONGS_DATA
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    p_rec RECORD;
    aggregated_songs JSONB;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'playlist_items') THEN
        FOR p_rec IN SELECT DISTINCT playlist_id FROM public.playlist_items LOOP
            SELECT COALESCE(jsonb_agg(song_data ORDER BY position ASC, added_at ASC), '[]'::jsonb)
            INTO aggregated_songs
            FROM public.playlist_items
            WHERE playlist_id = p_rec.playlist_id;

            UPDATE public.playlists
            SET songs_data = aggregated_songs,
                updated_at = NOW()
            WHERE id = p_rec.playlist_id;
        END LOOP;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. DROP SECURE RPC FUNCTIONS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_poll_vote(UUID, TEXT);
DROP FUNCTION IF EXISTS public.moderate_room_participant(VARCHAR, UUID, TEXT);
DROP FUNCTION IF EXISTS public.add_collaborative_playlist_item(UUID, TEXT, JSONB, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.backfill_playlist_jsonb_to_items(UUID);
DROP FUNCTION IF EXISTS public.rebalance_playlist_positions(UUID);
DROP FUNCTION IF EXISTS public.elect_next_room_host(VARCHAR);
DROP FUNCTION IF EXISTS public.elect_next_room_host(UUID);

-- ------------------------------------------------------------------------------
-- 2. RESTORE ORIGINAL PLAYLISTS RLS POLICY
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own or collaborative playlists" ON public.playlists;
CREATE POLICY "Users can view their own playlists" ON public.playlists
    FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. DROP COLLABORATIVE PLAYLIST TABLES
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.playlist_items CASCADE;
DROP TABLE IF EXISTS public.playlist_collaborators CASCADE;

-- Note: We preserve the optional columns (is_collaborative, version, description)
-- in public.playlists to avoid table locks or breaking legacy schema bindings.

-- ------------------------------------------------------------------------------
-- 4. DROP COMMUNITY MUSIC DISCOVERY TABLES
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.user_follows CASCADE;
DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.community_posts CASCADE;

-- ------------------------------------------------------------------------------
-- 5. DROP LISTENING PARTIES & REPORTS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.party_reports CASCADE;
DROP TABLE IF EXISTS public.parties CASCADE;

-- ------------------------------------------------------------------------------
-- 6. DROP SYNCHRONIZED LISTENING ROOMS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.room_participants CASCADE;
DROP TABLE IF EXISTS public.listening_rooms CASCADE;
