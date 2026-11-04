import { DailySeedEngine } from '../../engine/dailySeedEngine';

export interface CrossclimbRung {
    id: string;
    word: string;
    clue: string;
}

export interface CrossclimbPuzzle {
    id: string;
    topWord: string;
    bottomWord: string;
    rungs: CrossclimbRung[]; // Middle rungs to solve and order
    seed: string;
}

export const CROSSCLIMB_PUZZLES: CrossclimbPuzzle[] = [
    {
        id: 'cc-1',
        topWord: 'BEAT',
        bottomWord: 'TAPE',
        seed: 'cc-1',
        rungs: [
            { id: '1', word: 'BEAR', clue: 'Large furry woodland animal' },
            { id: '2', word: 'BARE', clue: 'Uncovered, exposed or naked' },
            { id: '3', word: 'DARE', clue: 'To challenge courageously' },
            { id: '4', word: 'DATE', clue: 'A day of the month or a calendar entry' },
        ],
    },
    {
        id: 'cc-2',
        topWord: 'SONG',
        bottomWord: 'SINK',
        seed: 'cc-2',
        rungs: [
            { id: '1', word: 'LONG', clue: 'Measuring a great distance' },
            { id: '2', word: 'LONE', clue: 'Solitary, single or alone' },
            { id: '3', word: 'LINE', clue: 'A continuous geometric mark or queue' },
            { id: '4', word: 'LINK', clue: 'A connection between two points or a URL' },
        ],
    },
    {
        id: 'cc-3',
        topWord: 'NOTE',
        bottomWord: 'TUBE',
        seed: 'cc-3',
        rungs: [
            { id: '1', word: 'VOTE', clue: 'A formal democratic ballot' },
            { id: '2', word: 'VOLE', clue: 'Small burrowing rodent resembling a mouse' },
            { id: '3', word: 'MOLE', clue: 'Spy infiltrating an organization or burrowing mammal' },
            { id: '4', word: 'MULE', clue: 'Hybrid offspring of a donkey and a horse' },
        ],
    },
];

export class CrossclimbEngine {
    public static getDailyPuzzle(seedStr: string): CrossclimbPuzzle {
        const prng = DailySeedEngine.createPrng(seedStr);
        const idx = Math.floor(prng() * CROSSCLIMB_PUZZLES.length);
        const p = CROSSCLIMB_PUZZLES[idx];
        return {
            ...p,
            seed: seedStr,
            rungs: DailySeedEngine.shuffle(p.rungs, prng),
        };
    }

    public static getPracticePuzzle(): CrossclimbPuzzle {
        const idx = Math.floor(Math.random() * CROSSCLIMB_PUZZLES.length);
        const p = CROSSCLIMB_PUZZLES[idx];
        const prng = Math.random;
        return {
            ...p,
            seed: `practice-${Date.now()}`,
            rungs: DailySeedEngine.shuffle(p.rungs, prng),
        };
    }

    /**
     * Checks if two equal-length words differ by:
     * 1. Exactly one letter substitution (e.g. BEAR -> DARE / DATE)
     * 2. Anagram (e.g. BEAR -> BARE, DATE -> TAPE)
     * 3. Anagram + 1 letter change
     */
    public static differsByOneOrAnagram(w1: string, w2: string): boolean {
        if (w1.length !== w2.length) return false;
        const upper1 = w1.toUpperCase();
        const upper2 = w2.toUpperCase();

        if (upper1 === upper2) return false;

        // Check 1 letter diff (substitution)
        let diffs = 0;
        for (let i = 0; i < upper1.length; i++) {
            if (upper1[i] !== upper2[i]) diffs++;
        }
        if (diffs === 1) return true;

        // Check exact anagram
        const sorted1 = upper1.split('').sort().join('');
        const sorted2 = upper2.split('').sort().join('');
        if (sorted1 === sorted2) return true;

        // Check multiset letter frequency difference <= 1 (e.g. DATE [A, D, E, T] vs TAPE [A, E, P, T])
        const counts1: Record<string, number> = {};
        for (const ch of upper1) counts1[ch] = (counts1[ch] || 0) + 1;
        let common = 0;
        for (const ch of upper2) {
            if (counts1[ch] && counts1[ch] > 0) {
                common++;
                counts1[ch]--;
            }
        }
        // If 3 letters out of 4 are common, it differs by 1 letter regardless of order
        return common >= upper1.length - 1;
    }

    /**
     * Validates if the ordered list of rungs creates a valid ladder from topWord to bottomWord.
     */
    public static validateLadder(
        topWord: string,
        bottomWord: string,
        rungs: { word: string }[]
    ): boolean {
        if (rungs.length === 0) return false;

        if (!this.differsByOneOrAnagram(topWord, rungs[0].word)) return false;

        for (let i = 0; i < rungs.length - 1; i++) {
            if (!this.differsByOneOrAnagram(rungs[i].word, rungs[i + 1].word)) return false;
        }

        if (!this.differsByOneOrAnagram(rungs[rungs.length - 1].word, bottomWord)) return false;

        return true;
    }
}
