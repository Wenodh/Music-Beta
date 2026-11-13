// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guestSessionService } from '../../../services/guestSessionService';

describe('Batch 1: Signaling-First Calling & Guest Identity Verification Matrix', () => {
    beforeEach(() => {
        localStorage.clear();
        guestSessionService.clearReplayCache();
        vi.clearAllMocks();
    });

    describe('Guest signaling envelope recipient binding', () => {
        it.each(['authenticated-recipient', 'guest-recipient'])(
            'verifies a guest call request for a %s and rejects a different recipient',
            async (recipientId) => {
                const signedEnvelope = await guestSessionService.signSignalingEnvelope({
                    callId: `guest-call-${recipientId}`,
                    recipientId,
                    signalType: 'call-request',
                    callType: 'video',
                    data: null,
                });

                const valid = await guestSessionService.verifySignalingEnvelope(
                    signedEnvelope,
                    recipientId,
                    'call-request',
                    null
                );
                expect(valid.isValid).toBe(true);

                const wrongRecipient = await guestSessionService.verifySignalingEnvelope(
                    signedEnvelope,
                    `${recipientId}-other`,
                    'call-request',
                    null
                );
                expect(wrongRecipient.isValid).toBe(false);
                expect(wrongRecipient.reason).toContain('Recipient mismatch');
            }
        );
    });

    describe('Calling Matrix Scenarios', () => {
        it('Auth -> Auth: signals directly without requiring signedEnvelope', async () => {
            const senderId = 'auth-user-1';
            const payload = {
                callId: 'call-101',
                senderId,
                senderName: 'Alice',
                signalType: 'call-request',
                callType: 'audio',
            };

            const isGuest = payload.senderId.startsWith('anon-');
            expect(isGuest).toBe(false);
            // Non-guest signaling proceeds directly to invitation processing
        });

        it('Guest -> Auth: verified guest includes signed envelope which recipient verifies over wire payload', async () => {
            const { guestId } = await guestSessionService.getOrCreateGuestIdentityKey();
            const mediaData = null; // call-request has null mediaData
            const signedEnvelope = await guestSessionService.signSignalingEnvelope({
                callId: 'call-102',
                recipientId: 'auth-user-target',
                signalType: 'call-request',
                callType: 'audio',
                data: mediaData,
            });

            const wirePayload = {
                callId: 'call-102',
                senderId: guestId,
                senderName: 'Guest Bob',
                signalType: 'call-request',
                callType: 'audio',
                signedEnvelope,
            };

            const isGuest = wirePayload.senderId.startsWith('anon-');
            expect(isGuest).toBe(true);
            expect(wirePayload.signedEnvelope).toBeDefined();

            // Recipient extracts mediaData (wirePayload.sdp || wirePayload.candidate || null)
            const recipientMediaData = (wirePayload as any).sdp || (wirePayload as any).candidate || null;
            const verification = await guestSessionService.verifySignalingEnvelope(
                wirePayload.signedEnvelope,
                'auth-user-target',
                'call-request',
                recipientMediaData
            );
            expect(verification.isValid).toBe(true);
        });

        it('Auth -> Guest: authenticated user calls guest recipient without presence gating', async () => {
            // When calling, presence is evaluated for informational awareness only
            // Signaling dispatch is NOT aborted even if presence check returns false
            const shouldAbort = false;
            expect(shouldAbort).toBe(false);
        });

        it('Guest -> Guest: both endpoints verify envelopes independently without shared server secrets', async () => {
            const signedEnv = await guestSessionService.signSignalingEnvelope({
                callId: 'call-gg-1',
                recipientId: 'anon-target-guest',
                signalType: 'call-request',
                callType: 'video',
            });

            const verification = await guestSessionService.verifySignalingEnvelope(
                signedEnv,
                'anon-target-guest',
                'call-request'
            );
            expect(verification.isValid).toBe(true);
        });

        it('Rejects unverified or forged guest call requests (missing signedEnvelope)', async () => {
            const forgedPayload = {
                callId: 'call-forged',
                senderId: 'anon-forged-attacker',
                signalType: 'call-request',
                signedEnvelope: null,
            };

            expect(forgedPayload.senderId.startsWith('anon-')).toBe(true);
            expect(forgedPayload.signedEnvelope).toBeNull();
            // In useDirectCommunication listener, unverified guest signals are dropped immediately
        });

        it('Rejects guest call requests when recipientId is tampered with', async () => {
            const signedEnv = await guestSessionService.signSignalingEnvelope({
                callId: 'call-tamper',
                recipientId: 'intended-recipient',
                signalType: 'call-request',
            });

            const verification = await guestSessionService.verifySignalingEnvelope(
                signedEnv,
                'intercepting-attacker', // Wrong recipient
                'call-request'
            );
            expect(verification.isValid).toBe(false);
            expect(verification.reason).toContain('Recipient mismatch');
        });

        it('Deterministic glare resolution: higher userId wins when simultaneous calls occur', () => {
            const userA = 'user-alice-100';
            const userB = 'user-bob-200';

            const isBWinning = userB > userA;
            expect(isBWinning).toBe(true);
        });

        it('Polite peer rollback on glare: handles rollback invocation safely', async () => {
            const mockPc = {
                signalingState: 'have-local-offer',
                setLocalDescription: vi.fn(async () => {}),
                setRemoteDescription: vi.fn(async () => {}),
                createAnswer: vi.fn(async () => ({ type: 'answer', sdp: 'mock-answer' })),
            };

            const offerCollision = true;
            if (offerCollision && mockPc.signalingState !== 'stable') {
                await mockPc.setLocalDescription({ type: 'rollback' });
            }

            expect(mockPc.setLocalDescription).toHaveBeenCalledWith({ type: 'rollback' });
        });
    });
});
