import { supabase } from '../../../lib/supabase';
import { Notification } from '../types';
import { eventBus } from '../../../lib/events';

export class NotificationService {
    private static instance: NotificationService;
    private subscription: any = null;

    private constructor() {}

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    async getNotifications(limit: number = 50): Promise<Notification[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*, actor:profiles!notifications_actor_id_fkey(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return [];
        return data as any;
    }

    async markAsRead(notificationId: string): Promise<void> {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
    }

    async markAllAsRead(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
    }

    subscribeToNotifications(onNotification: (n: Notification) => void) {
        if (this.subscription) return;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;

            this.subscription = supabase
                .channel(`notifications:${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, async (payload) => {
                    const { data: actor } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', payload.new.actor_id)
                        .single();

                    const notification = {
                        ...payload.new,
                        actor
                    } as Notification;

                    onNotification(notification);
                    eventBus.emit('NOTIFICATION_RECEIVED', notification);
                })
                .subscribe();
        });
    }

    unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}

export const notificationService = NotificationService.getInstance();
