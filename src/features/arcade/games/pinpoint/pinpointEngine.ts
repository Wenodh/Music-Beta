import { DailySeedEngine } from '../../engine/dailySeedEngine';

export interface PinpointPuzzle {
    id: string;
    category: string;
    acceptableAnswers: string[];
    clues: [string, string, string, string, string]; // 5 clues revealed one by one
}

export const PINPOINT_PUZZLE_BANK: PinpointPuzzle[] = [
    {
        id: 'pp-1',
        category: 'Legendary Indian Playback Singers',
        acceptableAnswers: ['singers', 'playback singers', 'indian singers', 'legendary playback singers', 'vocalists'],
        clues: [
            'S. P. Balasubrahmanyam',
            'Lata Mangeshkar',
            'K. J. Yesudas',
            'K. S. Chithra',
            'Kishore Kumar',
        ],
    },
    {
        id: 'pp-2',
        category: 'Acoustic String Instruments',
        acceptableAnswers: ['string instruments', 'acoustic instruments', 'stringed instruments', 'strings'],
        clues: [
            'Violin',
            'Sitar',
            'Acoustic Guitar',
            'Cello',
            'Veena',
        ],
    },
    {
        id: 'pp-3',
        category: 'Music Production Software & DAWs',
        acceptableAnswers: ['daw', 'daws', 'digital audio workstation', 'music production software', 'audio editors'],
        clues: [
            'Ableton Live',
            'FL Studio',
            'Logic Pro',
            'Pro Tools',
            'Cubase',
        ],
    },
    {
        id: 'pp-4',
        category: 'Oscar-Winning Composers',
        acceptableAnswers: ['oscar winners', 'oscar winning composers', 'academy award winners', 'film composers'],
        clues: [
            'A. R. Rahman',
            'M. M. Keeravani',
            'Hans Zimmer',
            'John Williams',
            'Ennio Morricone',
        ],
    },
    {
        id: 'pp-5',
        category: 'Studio Recording Gear',
        acceptableAnswers: ['studio gear', 'recording equipment', 'audio equipment', 'studio equipment', 'recording gear'],
        clues: [
            'Condenser Microphone',
            'Audio Interface',
            'Studio Monitor Speakers',
            'Pop Filter',
            'Headphones',
        ],
    },
    {
        id: 'pp-6',
        category: 'Iconic Percussion Instruments',
        acceptableAnswers: ['percussion instruments', 'drums', 'percussions', 'percussion', 'rhythm instruments'],
        clues: [
            'Tabla',
            'Mridangam',
            'Snare Drum',
            'Cajon',
            'Bongos',
        ],
    },
    {
        id: 'pp-7',
        category: 'Music Genres from the 1970s & 80s',
        acceptableAnswers: ['music genres', 'genres', 'musical genres'],
        clues: [
            'Disco',
            'Synthwave',
            'Punk Rock',
            'Reggae',
            'Funk',
        ],
    },
];

export class PinpointEngine {
    public static getDailyPuzzle(seedStr: string): PinpointPuzzle {
        const prng = DailySeedEngine.createPrng(seedStr);
        const idx = Math.floor(prng() * PINPOINT_PUZZLE_BANK.length);
        return PINPOINT_PUZZLE_BANK[idx];
    }

    public static getPracticePuzzle(): PinpointPuzzle {
        const idx = Math.floor(Math.random() * PINPOINT_PUZZLE_BANK.length);
        return PINPOINT_PUZZLE_BANK[idx];
    }

    /**
     * Checks if the user guess matches any acceptable answers or the exact category (case/punctuation insensitive).
     */
    public static checkGuess(guess: string, puzzle: PinpointPuzzle): boolean {
        const clean = guess.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
        const targetClean = puzzle.category.toLowerCase().replace(/[^a-z0-9 ]/g, '');

        if (clean === targetClean) return true;

        for (const ans of puzzle.acceptableAnswers) {
            const ansClean = ans.toLowerCase().replace(/[^a-z0-9 ]/g, '');
            if (clean === ansClean) return true;
            // Allow substring match if query has at least 5 chars
            if (clean.length >= 5 && (ansClean.includes(clean) || targetClean.includes(clean))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calculates score based on clues revealed:
     * 1 clue = 5,000 pts
     * 2 clues = 4,000 pts
     * 3 clues = 3,000 pts
     * 4 clues = 2,000 pts
     * 5 clues = 1,000 pts
     */
    public static calculateScore(cluesRevealed: number): number {
        const pts = Math.max(1, 6 - cluesRevealed) * 1000;
        return Math.max(1000, pts);
    }
}
