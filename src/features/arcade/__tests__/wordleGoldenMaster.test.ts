import { describe, it, expect } from 'vitest';
import { WordleEngine, MUSIC_WORDLE_WORDS } from '../games/wordle/wordleEngine';
import { WordleEngineAdapter } from '../games/wordle/wordleEngineAdapter';
import { TARGET_WORDS } from '../games/wordle/wordleDictionary';

describe('Wordle - Golden Master Regression & Legacy v1 Compatibility', () => {
    const adapter = WordleEngineAdapter.getInstance();

    it('preserves the original 25 music-themed words at indices 0..24 in exact order', () => {
        expect(MUSIC_WORDLE_WORDS.length).toBe(25);
        expect(TARGET_WORDS.length).toBeGreaterThanOrEqual(2300);

        for (let i = 0; i < 25; i++) {
            expect(TARGET_WORDS[i]).toBe(MUSIC_WORDLE_WORDS[i]);
        }
    });

    it('matches historical daily challenge answers for all 5 golden-master dates', () => {
        const goldenDates = [
            { date: '2026-01-01', expectedWord: 'BLUES', expectedIdx: 7 },
            { date: '2026-01-02', expectedWord: 'FLUTE', expectedIdx: 13 },
            { date: '2026-06-15', expectedWord: 'CHORD', expectedIdx: 1 },
            { date: '2026-11-05', expectedWord: 'RADIO', expectedIdx: 23 },
            { date: '2026-12-31', expectedWord: 'OUTRO', expectedIdx: 15 },
        ];

        goldenDates.forEach(({ date, expectedWord, expectedIdx }) => {
            const seed = `vibe-word:v1:${date}`;

            // Verify original engine output directly
            const legacyWord = WordleEngine.getDailyWord(seed);
            expect(legacyWord).toBe(expectedWord);
            expect(MUSIC_WORDLE_WORDS[expectedIdx]).toBe(expectedWord);

            // Verify adapter returns exact same output for v1 seed
            const adapterWord = adapter.getDailyTargetWord(seed);
            expect(adapterWord).toBe(expectedWord);
        });
    });

    it('verifies that malformed or non-v2 seeds always default safely to v1-legacy', () => {
        const malformedSeeds = [
            'vibe-word:corrupted-seed',
            'vibe-word:v0:2026-01-01',
            '',
            'random_seed_123',
        ];

        malformedSeeds.forEach((seed) => {
            expect(adapter.getGeneratorVersion(seed)).toBe('v1-legacy');
            const word = adapter.getDailyTargetWord(seed);
            expect(MUSIC_WORDLE_WORDS).toContain(word);
        });
    });
});
