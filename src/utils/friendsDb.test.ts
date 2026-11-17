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
