import { describe, it, expect } from 'vitest';
import { TARGET_WORDS, VALID_GUESS_LIST, VALID_GUESS_SET } from '../games/wordle/wordleDictionary';

describe('Wordle - Dictionary Format, Integrity & Coverage', () => {
    it('contains approximately 2,300+ target words and 12,000+ valid guesses', () => {
        expect(TARGET_WORDS.length).toBeGreaterThanOrEqual(2300);
        expect(TARGET_WORDS.length).toBeLessThan(2500);
        expect(VALID_GUESS_SET.size).toBeGreaterThanOrEqual(10600);
        expect(VALID_GUESS_LIST.length).toBe(VALID_GUESS_SET.size);
    });

    it('ensures every target word is strictly 5 uppercase ASCII characters', () => {
        TARGET_WORDS.forEach((word) => {
            expect(word).toHaveLength(5);
            expect(word).toMatch(/^[A-Z]{5}$/);
        });
    });

    it('ensures there are zero duplicates in TARGET_WORDS', () => {
        const uniqueSet = new Set(TARGET_WORDS);
        expect(uniqueSet.size).toBe(TARGET_WORDS.length);
    });

    it('guarantees that every target word is also accepted in VALID_GUESS_SET', () => {
        TARGET_WORDS.forEach((target) => {
            expect(VALID_GUESS_SET.has(target)).toBe(true);
        });
    });

    it('confirms common English and musical words exist in VALID_GUESS_SET', () => {
        const sampleWords = ['CRANE', 'SLATE', 'AUDIO', 'MUSIC', 'PIANO', 'ORGAN', 'LIGHT', 'HOUSE'];
        sampleWords.forEach((word) => {
            expect(VALID_GUESS_SET.has(word)).toBe(true);
        });
    });

    it('ensures nonsensical non-words are excluded from VALID_GUESS_SET', () => {
        const invalidSamples = ['AAAAA', 'XYZAB', 'QWERT', 'ZZZZZ', 'BZZZZ'];
        invalidSamples.forEach((word) => {
            expect(VALID_GUESS_SET.has(word)).toBe(false);
        });
    });
});
