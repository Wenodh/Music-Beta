-- ==============================================================================
-- Migration: 20261106000000_secure_social_notifications_rls.sql
-- Subsystem: Social Experience / Notifications Security (P0 VIBE-BUG-008)
--
-- Objective:
-- Eliminate unauthorized direct insertion into `public.social_notifications` by
-- untrusted clients. Legitimate social notifications (such as friend requests
-- and acceptances) are generated authoritatively by PostgreSQL SECURITY DEFINER
-- functions (`send_friend_request`, `respond_friend_request`) with fixed search paths.
--
-- Rollback:
-- See paired rollback script: 20261106000000_secure_social_notifications_rls_rollback.sql
-- ==============================================================================

-- 1. Drop overly permissive open insert policy
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.social_notifications;

-- 2. Create strict INSERT policy: Direct client inserts are strictly forbidden.
-- Only SECURITY DEFINER functions or superuser/service_role bypass RLS to create notifications.
CREATE POLICY "Deny direct client insert on social_notifications"
    ON public.social_notifications
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (false);

-- 3. Explicitly revoke table-level INSERT privileges from authenticated and anon roles as defense-in-depth
REVOKE INSERT ON public.social_notifications FROM authenticated;
REVOKE INSERT ON public.social_notifications FROM anon;

-- Ensure SELECT, UPDATE (for read status), and DELETE remain intact for the notification owner
GRANT SELECT, UPDATE, DELETE ON public.social_notifications TO authenticated;
