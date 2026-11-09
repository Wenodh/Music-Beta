-- Migration Rollback: 20261109000000_push_notifications_rollback.sql

DROP TABLE IF EXISTS public.push_notification_outbox CASCADE;
DROP TABLE IF EXISTS public.user_push_subscriptions CASCADE;
