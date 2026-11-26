import { describe, expect, it } from 'vitest';
import { getMaxSequenceForSender } from './friendsDb';

describe('message sequence high-water marks', () => {
    it('tracks each sender independently within the same conversation', () => {
        const messages = [
            { senderId: 'me', seq: 12 },
            { senderId: 'friend', seq: 3 },
            { senderId: 'me', seq: 13 },
            { senderId: 'friend', seq: 4 },
        ];

        expect(getMaxSequenceForSender(messages, 'me')).toBe(13);
        expect(getMaxSequenceForSender(messages, 'friend')).toBe(4);
    });

    it('ignores messages without a valid sequence', () => {
        expect(getMaxSequenceForSender([
            { senderId: 'friend', seq: undefined },
            { senderId: 'friend', seq: 0 },
            { senderId: 'other', seq: 99 },
        ], 'friend')).toBe(0);
    });
});

describe('durable message outbox retry policy', () => {
    it('uses bounded exponential backoff', async () => {
        const { getPendingMessageRetryDelayMs } = await import('./friendsDb');

        expect(getPendingMessageRetryDelayMs(1)).toBe(2_000);
        expect(getPendingMessageRetryDelayMs(2)).toBe(4_000);
        expect(getPendingMessageRetryDelayMs(3)).toBe(8_000);
        expect(getPendingMessageRetryDelayMs(99)).toBe(5 * 60_000);
        expect(getPendingMessageRetryDelayMs(0)).toBe(2_000);
    });
});
