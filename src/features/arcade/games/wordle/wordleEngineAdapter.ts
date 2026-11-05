import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { WordleEngine, WordleFeedback } from './wordleEngine';
import { TARGET_WORDS, VALID_GUESS_SET } from './wordleDictionary';

export type WordleGeneratorVersion = 'v1-legacy' | 'v2-expanded';

export interface WordleValidationResult {
    isValid: boolean;
    reason?: 'EMPTY' | 'NOT_ENOUGH_LETTERS' | 'INVALID_CHARACTERS' | 'NOT_IN_WORD_LIST';
}

export interface IWordleEngineAdapter {
    getDailyTargetWord(seedStr: string, explicitVersion?: WordleGeneratorVersion): string;
    getPracticeTargetWord(previousWord?: string): string;
    isValidGuess(guess: string): WordleValidationResult;
    evaluateGuess(guess: string, target: string): WordleFeedback[];
    getGeneratorVersion(seedStr: string): WordleGeneratorVersion;
}

export class WordleEngineAdapter implements IWordleEngineAdapter {
    private static instance: WordleEngineAdapter;

    public static getInstance(): WordleEngineAdapter {
        if (!this.instance) {
            this.instance = new WordleEngineAdapter();
        }
        return this.instance;
    }

    /**
     * Explicitly parses generator version from seed string.
     * Legacy daily challenges with ':v1:' or 'v1-' use 'v1-legacy'.
     * Unsupported or malformed formats default safely to 'v1-legacy' to prevent accidental v2 leakage.
     * Only explicit ':v2:' or 'v2-' seeds route to 'v2-expanded'.
     */
    public getGeneratorVersion(seedStr: string): WordleGeneratorVersion {
        if (typeof seedStr !== 'string') return 'v1-legacy';
        if (seedStr.includes(':v2:') || seedStr.startsWith('v2-')) {
            return 'v2-expanded';
        }
        return 'v1-legacy';
    }

    /**
     * Resolves the daily target word.
     * For v1-legacy: delegates directly to the unchanged WordleEngine.getDailyWord.
     * For v2-expanded: deterministically indexes into the full TARGET_WORDS dictionary.
     */
    public getDailyTargetWord(seedStr: string, explicitVersion?: WordleGeneratorVersion): string {
        const version = explicitVersion || this.getGeneratorVersion(seedStr);

        if (version === 'v1-legacy') {
            return WordleEngine.getDailyWord(seedStr);
        }

        // v2-expanded deterministic target selection
        const prng = DailySeedEngine.createPrng(seedStr);
        const idx = Math.floor(prng() * TARGET_WORDS.length);
        return TARGET_WORDS[idx];
    }

    /**
     * Returns a random practice target word from the expanded dictionary,
     * avoiding immediate consecutive repeat of previousWord.
     */
    public getPracticeTargetWord(previousWord?: string): string {
        let attempts = 0;
        let chosen = TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)];

        while (attempts < 10 && previousWord && chosen === previousWord.toUpperCase()) {
            chosen = TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)];
            attempts++;
        }

        return chosen;
    }

    /**
     * Normalizes and validates player guess.
     * Rejects non-words, non-alphabetics, and incorrect lengths without consuming a turn.
     */
    public isValidGuess(guess: string): WordleValidationResult {
        if (!guess) {
            return { isValid: false, reason: 'EMPTY' };
        }

        const normalized = guess.trim().toUpperCase();

        if (normalized.length !== 5) {
            return { isValid: false, reason: 'NOT_ENOUGH_LETTERS' };
        }

        if (!/^[A-Z]{5}$/.test(normalized)) {
            return { isValid: false, reason: 'INVALID_CHARACTERS' };
        }

        if (!VALID_GUESS_SET.has(normalized)) {
            return { isValid: false, reason: 'NOT_IN_WORD_LIST' };
        }

        return { isValid: true };
    }

    /**
     * Evaluates letter feedback against target word (delegates to WordleEngine).
     */
    public evaluateGuess(guess: string, target: string): WordleFeedback[] {
        const cleanGuess = (guess || '').trim().toUpperCase();
        const cleanTarget = (target || '').trim().toUpperCase();
        return WordleEngine.evaluateGuess(cleanGuess, cleanTarget);
    }
}
