import { describe, expect, it } from 'vitest';
import {
    classifyCallQuality,
    getIceRestartDelay,
    getMediaAccessErrorMessage,
    MAX_ICE_RESTART_ATTEMPTS,
    MAX_WAITING_CALLS,
} from './callReliability';

describe('callReliability', () => {
    it('uses bounded exponential-style ICE retry delays', () => {
        expect([1, 2, 3, 4, 5].map(getIceRestartDelay)).toEqual([1000, 2500, 5000, 9000, 9000]);
        expect(MAX_ICE_RESTART_ATTEMPTS).toBe(4);
    });

    it('classifies call quality using RTT, jitter and packet loss', () => {
        expect(classifyCallQuality({ rttMs: 50, jitterMs: 5, packetLossPercent: 0 }).level).toBe('excellent');
        expect(classifyCallQuality({ rttMs: 180, jitterMs: 8, packetLossPercent: 0 }).level).toBe('good');
        expect(classifyCallQuality({ rttMs: 280, jitterMs: 10, packetLossPercent: 0 }).level).toBe('fair');
        expect(classifyCallQuality({ rttMs: 80, jitterMs: 12, packetLossPercent: 10 }).level).toBe('poor');
        expect(classifyCallQuality({}).level).toBe('unknown');
    });

    it('explains permission denial separately from missing hardware', () => {
        expect(getMediaAccessErrorMessage(new DOMException('denied', 'NotAllowedError'), 'microphone')).toContain('permission was denied');
        expect(getMediaAccessErrorMessage(new DOMException('missing', 'NotFoundError'), 'camera')).toContain('No camera was found');
    });

    it('limits waiting calls to one queued caller', () => {
        expect(MAX_WAITING_CALLS).toBe(1);
    });
});
