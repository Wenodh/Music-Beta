// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { guestSessionService, computePayloadHash } from '../guestSessionService';

describe('GuestSessionService - Message-Level Envelope Signing & Verification', () => {
    beforeEach(() => {
        localStorage.clear();
        guestSessionService.clearReplayCache();
    });

    it('generates a stable device installation id and ECDSA keypair', async () => {
        const inst1 = guestSessionService.getInstallationId();
        const inst2 = guestSessionService.getInstallationId();
        expect(inst1).toBe(inst2);
        expect(inst1.startsWith('inst-')).toBe(true);

        const { guestId, publicKeyJwk } = await guestSessionService.getOrCreateGuestIdentityKey();
        expect(guestId.startsWith('anon-')).toBe(true);
        expect(publicKeyJwk.kty).toBe('EC');
        expect(publicKeyJwk.crv).toBe('P-256');
    });

    it('signs and verifies a valid signaling envelope with payload hash', async () => {
        const sdpData = { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1' };
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-100',
            recipientId: 'user-bob',
            signalType: 'offer',
            callType: 'video',
            data: sdpData,
        });

        expect(signedEnv.envelope.callId).toBe('call-100');
        expect(signedEnv.envelope.payloadHash).toBe(await computePayloadHash(sdpData));

        const verification = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-bob',
            'offer',
            sdpData
        );
        expect(verification.isValid).toBe(true);
    });

    it('rejects an envelope if recipientId is tampered with', async () => {
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-101',
            recipientId: 'user-bob',
            signalType: 'call-request',
        });

        const verification = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-charlie', // Recipient mismatch!
            'call-request'
        );
        expect(verification.isValid).toBe(false);
        expect(verification.reason).toContain('Recipient mismatch');
    });

    it('rejects an envelope if callId is modified after signing', async () => {
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-102',
            recipientId: 'user-bob',
            signalType: 'call-request',
        });

        // Attacker attempts to reuse envelope for a different callId
        signedEnv.envelope.callId = 'call-forged-999';

        const verification = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-bob',
            'call-request'
        );
        expect(verification.isValid).toBe(false);
        expect(verification.reason).toContain('signature verification failed');
    });

    it('rejects an envelope if SDP or ICE payload is tampered with', async () => {
        const originalSdp = { type: 'offer', sdp: 'v=0\r\no=- 1111 2 IN IP4 127.0.0.1' };
        const tamperedSdp = { type: 'offer', sdp: 'v=0\r\no=- 9999 2 IN IP4 192.168.1.1' };

        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-103',
            recipientId: 'user-bob',
            signalType: 'offer',
            data: originalSdp,
        });

        const verification = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-bob',
            'offer',
            tamperedSdp // tampered SDP payload
        );
        expect(verification.isValid).toBe(false);
        expect(verification.reason).toContain('Payload hash mismatch');
    });

    it('rejects replay attacks re-transmitting the same nonce and envelope', async () => {
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-104',
            recipientId: 'user-bob',
            signalType: 'call-request',
        });

        // First verification: accepted
        const first = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-bob',
            'call-request'
        );
        expect(first.isValid).toBe(true);

        // Replay attempt with same envelope: rejected by replay cache
        const replay = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-bob',
            'call-request'
        );
        expect(replay.isValid).toBe(false);
        expect(replay.reason).toContain('Replay attack detected');
    });

    it('rejects expired envelopes (>30s)', async () => {
        const signedEnv = await guestSessionService.signSignalingEnvelope({
            callId: 'call-105',
            recipientId: 'user-bob',
            signalType: 'call-request',
        });

        signedEnv.envelope.expiresAt = Date.now() - 60000;

        const verification = await guestSessionService.verifySignalingEnvelope(
            signedEnv,
            'user-bob',
            'call-request'
        );
        expect(verification.isValid).toBe(false);
        expect(verification.reason).toContain('expired');
    });
});
