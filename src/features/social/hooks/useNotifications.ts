import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { notificationService } from '../services/NotificationService';
import { setNotifications, addNotification, markNotificationRead, setLoading } from '../socialSlice';

export const useNotifications = () => {
    const dispatch = useDispatch();
    const notifications = useSelector((state: RootState) => state.social.notifications);
    const unreadCount = useSelector((state: RootState) => state.social.unreadNotificationCount);
    const loading = useSelector((state: RootState) => state.social.loading.notifications);

    const fetchNotifications = useCallback(async () => {
        dispatch(setLoading({ key: 'notifications', value: true }));
        try {
            const data = await notificationService.getNotifications();
            dispatch(setNotifications(data));
        } catch (error) {
            logger.error('Failed to fetch notifications', error);
        } finally {
            dispatch(setLoading({ key: 'notifications', value: false }));
        }
    }, [dispatch]);

    useEffect(() => {
        fetchNotifications();

        notificationService.subscribeToNotifications((notification) => {
            dispatch(addNotification(notification));
        });

        return () => {
            notificationService.unsubscribe();
        };
    }, [fetchNotifications, dispatch]);

    const markRead = async (id: string) => {
        dispatch(markNotificationRead(id));
        await notificationService.markAsRead(id);
    };

    const markAllRead = async () => {
        await notificationService.markAllAsRead();
        fetchNotifications();
    };

    return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications };
};
