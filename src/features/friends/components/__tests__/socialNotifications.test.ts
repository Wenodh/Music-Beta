import { describe, it, expect } from 'vitest';
import { socialNotificationService } from '../../../../services/socialNotificationService';

describe('Sprint 2.5 Social Notification Service Tests', () => {
    it('creates well-formatted local missed call notification', () => {
        const notif = socialNotificationService.createLocalMissedCallNotification(
            'caller-123',
            'Alice',
            'video'
        );

        expect(notif.id).toContain('notif-missed-');
        expect(notif.type).toBe('missed_call');
        expect(notif.title).toBe('Missed Video Call');
        expect(notif.message).toBe('You missed a call from Alice');
        expect(notif.is_read).toBe(false);
        expect(notif.actor_id).toBe('caller-123');
    });

    it('formats audio missed call notification correctly', () => {
        const notif = socialNotificationService.createLocalMissedCallNotification(
            'caller-456',
            'Bob',
            'audio'
        );

        expect(notif.title).toBe('Missed Voice Call');
        expect(notif.message).toBe('You missed a call from Bob');
    });
});
