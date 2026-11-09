// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { pushNotificationService, PushEventPayload } from '../pushNotificationService';

describe('PushNotificationService - Architecture & Payload Privacy', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('generates privacy-safe notification payload without leaking message plaintext or keys', () => {
        const event: PushEventPayload = {
            eventType: 'direct_message',
            senderId: 'user-alice',
            senderName: 'Alice',
            targetUserId: 'user-bob',
        };

        const built = pushNotificationService.buildPrivacySafePayload(event);
        expect(built.title).toBe('New Message');
        expect(built.body).toContain('encrypted message');
        // Ensures no plaintext text field is attached to push payload
        expect((built.data as any).text).toBeUndefined();
        expect((built.data as any).key).toBeUndefined();
    });

    it('builds distinct notifications for call, request, and party events', () => {
        const callEvent: PushEventPayload = {
            eventType: 'incoming_call',
            senderId: 'user-carol',
            senderName: 'Carol',
            targetUserId: 'user-bob',
            callType: 'video',
            callId: 'call-999',
        };

        const callPayload = pushNotificationService.buildPrivacySafePayload(callEvent);
        expect(callPayload.title).toBe('Incoming Video Call');
        expect(callPayload.data.callId).toBe('call-999');

        const partyEvent: PushEventPayload = {
            eventType: 'party_invitation',
            senderId: 'user-dave',
            senderName: 'Dave',
            targetUserId: 'user-bob',
            roomCode: 'room-123',
        };

        const partyPayload = pushNotificationService.buildPrivacySafePayload(partyEvent);
        expect(partyPayload.title).toBe('Listening Party Invite');
        expect(partyPayload.data.roomCode).toBe('room-123');
    });

    it('gracefully handles missing VAPID public key without throwing errors', async () => {
        const result = await pushNotificationService.registerWebPush('user-test');
        expect(result).toBeNull();
    });
});
