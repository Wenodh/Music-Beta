-- ==============================================================================
-- Migration Rollback: 20261106000000_secure_social_notifications_rls_rollback.sql
-- Subsystem: Social Experience / Notifications Security (P0 VIBE-BUG-008)
--
-- Objective:
-- Rollback for 20261106000000_secure_social_notifications_rls.sql.
-- ==============================================================================

-- 1. Drop denial policy
DROP POLICY IF EXISTS "Deny direct client insert on social_notifications" ON public.social_notifications;

-- 2. Restore previous policy (authenticated users can insert)
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.social_notifications;
CREATE POLICY "Users can create notifications for others"
    ON public.social_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Restore table INSERT grant to authenticated
GRANT INSERT ON public.social_notifications TO authenticated;
