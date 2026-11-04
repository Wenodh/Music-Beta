import { supabase } from '../lib/supabase';
import { SocialNotification } from '../types/social';

export const socialNotificationService = {
    /**
     * Fetch user notifications from Supabase cloud.
     */
    async getNotifications(userId: string): Promise<SocialNotification[]> {
        try {
            const { data, error } = await supabase
                .from('social_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.warn('[socialNotificationService] getNotifications error:', error.message);
                return [];
            }

            return data || [];
        } catch (e) {
            console.warn('[socialNotificationService] getNotifications exception:', e);
            return [];
        }
    },

    /**
     * Mark single notification as read.
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('social_notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            return !error;
        } catch (e) {
            console.warn('[socialNotificationService] markAsRead exception:', e);
            return false;
        }
    },

    /**
     * Mark all notifications as read for current user.
     */
    async markAllAsRead(userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('social_notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            return !error;
        } catch (e) {
            console.warn('[socialNotificationService] markAllAsRead exception:', e);
            return false;
        }
    },

    /**
     * Create in-app missed call notification for local user (stored in IndexedDB/Redux or Supabase).
     */
    createLocalMissedCallNotification(callerId: string, callerName: string, callType: 'audio' | 'video'): SocialNotification {
        return {
            id: `notif-missed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            user_id: 'local',
            actor_id: callerId,
            type: 'missed_call',
            title: `Missed ${callType === 'video' ? 'Video' : 'Voice'} Call`,
            message: `You missed a call from ${callerName}`,
            is_read: false,
            created_at: new Date().toISOString(),
        };
    },
};
