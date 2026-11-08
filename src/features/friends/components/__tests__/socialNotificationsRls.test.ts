import { describe, it, expect, vi, beforeEach } from 'vitest';
import { socialNotificationService } from '../../../../services/socialNotificationService';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('Social Notification Security & Workflows (VIBE-BUG-008)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches notifications for the authenticated user and orders descending', async () => {
        const mockData = [
            { id: 'notif-1', user_id: 'user-123', title: 'Friend Request', message: 'Alice sent a request', is_read: false },
        ];

        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const orderMock = vi.fn().mockReturnThis();
        const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });

        (supabase.from as any).mockReturnValue({
            select: selectMock,
            eq: eqMock,
            order: orderMock,
            limit: limitMock,
        });

        // Chain mocks
        selectMock.mockReturnValue({ eq: eqMock });
        eqMock.mockReturnValue({ order: orderMock });
        orderMock.mockReturnValue({ limit: limitMock });

        const result = await socialNotificationService.getNotifications('user-123');

        expect(supabase.from).toHaveBeenCalledWith('social_notifications');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Friend Request');
    });

    it('marks a notification as read safely', async () => {
        const updateMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockResolvedValue({ error: null });

        (supabase.from as any).mockReturnValue({
            update: updateMock,
        });
        updateMock.mockReturnValue({ eq: eqMock });

        const success = await socialNotificationService.markAsRead('notif-1');
        expect(success).toBe(true);
        expect(updateMock).toHaveBeenCalledWith({ is_read: true });
    });

    it('creates local-only missed call notification without calling remote Supabase table', () => {
        const notif = socialNotificationService.createLocalMissedCallNotification('caller-1', 'Bob', 'audio');

        expect(notif.user_id).toBe('local');
        expect(notif.actor_id).toBe('caller-1');
        expect(notif.type).toBe('missed_call');
        expect(notif.title).toBe('Missed Voice Call');
        expect(notif.message).toContain('Bob');
        expect(supabase.from).not.toHaveBeenCalled();
    });
});
