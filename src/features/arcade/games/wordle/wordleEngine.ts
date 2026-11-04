import { DailySeedEngine } from '../../engine/dailySeedEngine';

export type WordleFeedback = 'correct' | 'present' | 'absent';

export const MUSIC_WORDLE_WORDS = [
    'TEMPO',
    'CHORD',
    'VOCAL',
    'TRACK',
    'AUDIO',
    'ALBUM',
    'MUSIC',
    'BLUES',
    'VINYL',
    'STAGE',
    'DRUMS',
    'PIANO',
    'ORGAN',
    'FLUTE',
    'INTRO',
    'OUTRO',
    'SOLOS',
    'PITCH',
    'SCALE',
    'TUNER',
    'NOTES',
    'BEATS',
    'SOUND',
    'RADIO',
    'DISCO',
];

export class WordleEngine {
    public static getDailyWord(seedStr: string): string {
        const prng = DailySeedEngine.createPrng(seedStr);
        const idx = Math.floor(prng() * MUSIC_WORDLE_WORDS.length);
        return MUSIC_WORDLE_WORDS[idx];
    }

    public static getPracticeWord(): string {
        const idx = Math.floor(Math.random() * MUSIC_WORDLE_WORDS.length);
        return MUSIC_WORDLE_WORDS[idx];
    }

    /**
     * Evaluates a 5-letter guess against the target word.
     * Correct = Green (right spot)
     * Present = Yellow (in word, wrong spot)
     * Absent = Gray (not in word)
     */
    public static evaluateGuess(guess: string, target: string): WordleFeedback[] {
        const result: WordleFeedback[] = Array(5).fill('absent');
        const targetLetters = target.toUpperCase().split('');
        const guessLetters = guess.toUpperCase().split('');

        const letterCounts: Record<string, number> = {};
        for (const ch of targetLetters) {
            letterCounts[ch] = (letterCounts[ch] || 0) + 1;
        }

        // Pass 1: find correct (green)
        for (let i = 0; i < 5; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                result[i] = 'correct';
                letterCounts[guessLetters[i]]--;
            }
        }

        // Pass 2: find present (yellow)
        for (let i = 0; i < 5; i++) {
            if (result[i] !== 'correct') {
                const ch = guessLetters[i];
                if (letterCounts[ch] && letterCounts[ch] > 0) {
                    result[i] = 'present';
                    letterCounts[ch]--;
                }
            }
        }

        return result;
    }
}
