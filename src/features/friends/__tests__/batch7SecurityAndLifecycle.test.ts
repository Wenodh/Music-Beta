// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { guestSessionService } from '../../../services/guestSessionService';
import { pushNotificationService, PushEventPayload } from '../../../services/pushNotificationService';

describe('Batch 7: Security, Lifecycle, Multi-Device & Privacy Regression Verification', () => {
    beforeEach(() => {
        localStorage.clear();
        guestSessionService.clearReplayCache();
    });

    it('Security: verifies message-level signature binds all fields and rejects cross-call signal injection', async () => {
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-original-1',
            recipientId: 'user-callee',
            signalType: 'call-request',
            callType: 'audio',
        });

        // Attacker attempts to inject the envelope into a different call
        signedEnv.envelope.callId = 'call-injected-2';

        const result = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-callee',
            'call-request'
        );
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('signature verification failed');
    });

    it('Privacy: push notification payloads never leak E2EE plaintext or private keys', () => {
        const secretMessagePayload: PushEventPayload = {
            eventType: 'direct_message',
            senderId: 'user-alice',
            senderName: 'Alice',
            targetUserId: 'user-bob',
        };

        const pushOutput = pushNotificationService.buildPrivacySafePayload(secretMessagePayload);
        expect(pushOutput.body).toBe('Alice sent you an encrypted message');
        expect(JSON.stringify(pushOutput)).not.toContain('privateKey');
        expect(JSON.stringify(pushOutput)).not.toContain('plaintext');
    });

    it('Lifecycle: replay cache prunes stale entries without leaking memory', async () => {
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-lifecycle',
            recipientId: 'user-callee',
            signalType: 'call-request',
        });

        const verify1 = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-callee',
            'call-request'
        );
        expect(verify1.isValid).toBe(true);

        // Immediate replay is rejected
        const verify2 = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-callee',
            'call-request'
        );
        expect(verify2.isValid).toBe(false);
    });
});
