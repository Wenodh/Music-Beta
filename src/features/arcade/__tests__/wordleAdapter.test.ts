import { describe, it, expect } from 'vitest';
import { WordleEngineAdapter } from '../games/wordle/wordleEngineAdapter';
import { TARGET_WORDS } from '../games/wordle/wordleDictionary';

describe('Wordle - Engine Adapter & Guess Validation Logic', () => {
    const adapter = WordleEngineAdapter.getInstance();

    describe('Generator Versioning', () => {
        it('resolves v1-legacy for seeds containing :v1:', () => {
            expect(adapter.getGeneratorVersion('vibe-word:v1:2026-11-05')).toBe('v1-legacy');
        });

        it('resolves v2-expanded for seeds containing :v2:', () => {
            expect(adapter.getGeneratorVersion('vibe-word:v2:2026-11-05')).toBe('v2-expanded');
        });

        it('defaults safely to v1-legacy for undefined/null/corrupted strings', () => {
            expect(adapter.getGeneratorVersion(undefined as any)).toBe('v1-legacy');
            expect(adapter.getGeneratorVersion('random')).toBe('v1-legacy');
        });
    });

    describe('Deterministic v2 Target Generation', () => {
        it('produces identical v2 target word for the same seed', () => {
            const seed = 'vibe-word:v2:2026-11-05';
            const word1 = adapter.getDailyTargetWord(seed);
            const word2 = adapter.getDailyTargetWord(seed);
            expect(word1).toBe(word2);
            expect(TARGET_WORDS).toContain(word1);
        });

        it('produces different valid target words across different dates in v2', () => {
            const wordA = adapter.getDailyTargetWord('vibe-word:v2:2026-01-01');
            const wordB = adapter.getDailyTargetWord('vibe-word:v2:2026-06-01');
            expect(TARGET_WORDS).toContain(wordA);
            expect(TARGET_WORDS).toContain(wordB);
        });
    });

    describe('Practice Mode Repeat Avoidance', () => {
        it('avoids repeating the immediately previous word when selecting practice target', () => {
            const previous = 'TEMPO';
            for (let i = 0; i < 20; i++) {
                const nextWord = adapter.getPracticeTargetWord(previous);
                expect(nextWord).not.toBe(previous);
                expect(TARGET_WORDS).toContain(nextWord);
            }
        });
    });

    describe('Guess Normalization & Dictionary Validation', () => {
        it('accepts valid 5-letter uppercase words', () => {
            const result = adapter.isValidGuess('CRANE');
            expect(result.isValid).toBe(true);
        });

        it('normalizes lowercase input and surrounding whitespace automatically', () => {
            const result = adapter.isValidGuess('  crane  ');
            expect(result.isValid).toBe(true);
        });

        it('rejects empty or incomplete guesses with specific reasons', () => {
            expect(adapter.isValidGuess('')).toEqual({ isValid: false, reason: 'EMPTY' });
            expect(adapter.isValidGuess('CAT')).toEqual({ isValid: false, reason: 'NOT_ENOUGH_LETTERS' });
            expect(adapter.isValidGuess('GUITAR')).toEqual({ isValid: false, reason: 'NOT_ENOUGH_LETTERS' });
        });

        it('rejects non-alphabetic inputs', () => {
            expect(adapter.isValidGuess('CR4NE')).toEqual({ isValid: false, reason: 'INVALID_CHARACTERS' });
            expect(adapter.isValidGuess('CR!NE')).toEqual({ isValid: false, reason: 'INVALID_CHARACTERS' });
        });

        it('rejects words not in the valid dictionary without advancing', () => {
            const result = adapter.isValidGuess('AAAAA');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('NOT_IN_WORD_LIST');
        });
    });

    describe('Double-Letter Evaluation Edge Cases', () => {
        it('handles double letters correctly when target has only one occurrence', () => {
            // Target: SPEED (one E? No, SPEED has two E's). Let's use target: CRANE (one E).
            // Guess: GEESE (three E's).
            // Only 1 'E' in CRANE. Position 4 of CRANE is E.
            // In GEESE: G(absent), E(absent), E(absent), S(absent), E(correct at pos 4).
            const feedback = adapter.evaluateGuess('GEESE', 'CRANE');
            expect(feedback[4]).toBe('correct');
            // The other E's should be absent because target has only one E
            expect(feedback[1]).toBe('absent');
            expect(feedback[2]).toBe('absent');
        });

        it('handles duplicate letters in guess where target has two occurrences', () => {
            // Target: SPEED (two E's)
            // Guess: ERECT (two E's)
            // Target letters: S P E E D
            // Guess letters:  E R E C T
            // pos 2 is E vs E -> correct
            // pos 0 is E vs S -> present
            const feedback = adapter.evaluateGuess('ERECT', 'SPEED');
            expect(feedback[0]).toBe('present');
            expect(feedback[2]).toBe('correct');
        });
    });
});
