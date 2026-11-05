-- Rollback: 20261105000000_arcade_leaderboards_rollback.sql

DROP FUNCTION IF EXISTS public.submit_arcade_score(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS public.arcade_leaderboards CASCADE;
