import { describe, it, expect } from 'vitest';
import { DailySeedEngine } from '../engine/dailySeedEngine';
import { QueensEngine } from '../games/queens/queensEngine';
import { TangoEngine } from '../games/tango/tangoEngine';
import { PinpointEngine } from '../games/pinpoint/pinpointEngine';
import { CrossclimbEngine } from '../games/crossclimb/crossclimbEngine';
import { WordleEngine } from '../games/wordle/wordleEngine';

describe('Vibe Arcade Batch 1: Pure Logic Engines & Solvers', () => {
    describe('DailySeedEngine', () => {
        it('generates consistent deterministic daily seeds for same date', () => {
            const seed1 = DailySeedEngine.getDailySeed('vibe-queens', '2026-11-05');
            const seed2 = DailySeedEngine.getDailySeed('vibe-queens', '2026-11-05');
            expect(seed1).toBe('vibe-queens:v1:2026-11-05');
            expect(seed1).toBe(seed2);

            const prng1 = DailySeedEngine.createPrng(seed1);
            const prng2 = DailySeedEngine.createPrng(seed2);
            expect(prng1()).toBe(prng2());
            expect(prng1()).toBe(prng2());
        });

        it('produces different sequences for different seeds', () => {
            const prngA = DailySeedEngine.createPrng('seed-A');
            const prngB = DailySeedEngine.createPrng('seed-B');
            expect(prngA()).not.toBe(prngB());
        });
    });

    describe('QueensEngine', () => {
        it('generates a valid, solvable 6x6 Queens puzzle with contiguous regions', () => {
            const puzzle = QueensEngine.generatePuzzle(6, 'test-seed-123');
            expect(puzzle.size).toBe(6);
            expect(puzzle.regions.length).toBe(6);
            expect(puzzle.solution.length).toBe(6);

            // Test if the generated solution is valid on the generated board
            const board = Array.from({ length: 6 }, () => Array(6).fill('empty' as const));
            puzzle.solution.forEach(({ r, c }) => {
                board[r][c] = 'crown';
            });

            expect(QueensEngine.isSolved(board, puzzle.regions)).toBe(true);
        });

        it('detects violations when two queens share row, col, or are adjacent', () => {
            const puzzle = QueensEngine.generatePuzzle(6, 'test-seed-123');
            const board = Array.from({ length: 6 }, () => Array(6).fill('empty' as const));
            board[0][0] = 'crown';
            board[0][3] = 'crown'; // Same row conflict

            const conflicts = QueensEngine.findConflicts(board, puzzle.regions);
            expect(conflicts.has('0,0')).toBe(true);
            expect(conflicts.has('0,3')).toBe(true);
            expect(QueensEngine.isSolved(board, puzzle.regions)).toBe(false);
        });
    });

    describe('TangoEngine', () => {
        it('generates a valid 6x6 Tango puzzle and verifies its solution', () => {
            const puzzle = TangoEngine.generatePuzzle('tango-seed-456');
            expect(puzzle.size).toBe(6);
            expect(puzzle.solution.length).toBe(6);

            // Solution must be completely solved
            expect(TangoEngine.isSolved(puzzle.solution, puzzle.constraints)).toBe(true);
        });

        it('detects violations with 3 consecutive identical symbols', () => {
            const puzzle = TangoEngine.generatePuzzle('tango-seed-456');
            const grid: any = [
                ['sun', 'sun', 'sun', 'moon', 'moon', 'sun'],
                ['moon', 'sun', 'moon', 'sun', 'sun', 'moon'],
                ['sun', 'sun', 'moon', 'moon', 'sun', 'moon'],
                ['moon', 'moon', 'sun', 'sun', 'moon', 'sun'],
                ['moon', 'sun', 'sun', 'moon', 'sun', 'moon'],
                ['sun', 'moon', 'moon', 'sun', 'moon', 'sun'],
            ];

            const { isValid, errors } = TangoEngine.validateBoard(grid, puzzle.constraints);
            expect(isValid).toBe(false);
            expect(errors.has('0,0')).toBe(true);
            expect(errors.has('0,1')).toBe(true);
            expect(errors.has('0,2')).toBe(true);
        });
    });

    describe('PinpointEngine', () => {
        it('evaluates exact match and accepted synonyms correctly', () => {
            const puzzle = {
                id: 'test',
                category: 'Acoustic String Instruments',
                acceptableAnswers: ['string instruments', 'acoustic instruments'],
                clues: ['Violin', 'Sitar', 'Guitar', 'Cello', 'Veena'] as [string, string, string, string, string],
            };

            expect(PinpointEngine.checkGuess('acoustic string instruments', puzzle)).toBe(true);
            expect(PinpointEngine.checkGuess('string instruments', puzzle)).toBe(true);
            expect(PinpointEngine.checkGuess('brass horns', puzzle)).toBe(false);
        });

        it('calculates score decreasing from 5,000 to 1,000 depending on clues used', () => {
            expect(PinpointEngine.calculateScore(1)).toBe(5000);
            expect(PinpointEngine.calculateScore(2)).toBe(4000);
            expect(PinpointEngine.calculateScore(3)).toBe(3000);
            expect(PinpointEngine.calculateScore(4)).toBe(2000);
            expect(PinpointEngine.calculateScore(5)).toBe(1000);
        });
    });

    describe('CrossclimbEngine', () => {
        it('validates 1-letter change or anagram difference correctly', () => {
            expect(CrossclimbEngine.differsByOneOrAnagram('BEAR', 'BARE')).toBe(true); // Anagram
            expect(CrossclimbEngine.differsByOneOrAnagram('BEAR', 'BEAT')).toBe(true); // 1-letter diff
            expect(CrossclimbEngine.differsByOneOrAnagram('BEAR', 'COOL')).toBe(false);
        });

        it('validates valid ladder transitions', () => {
            const topWord = 'BEAT';
            const bottomWord = 'TAPE';
            const rungs = [
                { word: 'BEAR' },
                { word: 'BARE' },
                { word: 'DARE' },
                { word: 'DATE' },
            ];
            expect(CrossclimbEngine.validateLadder(topWord, bottomWord, rungs)).toBe(true);
        });
    });

    describe('WordleEngine', () => {
        it('evaluates feedback with correct greens, yellows, and grays', () => {
            const target = 'TEMPO';
            const guess = 'TRACK';
            // T: correct (green)
            // R: absent (gray)
            // A: absent (gray)
            // C: absent (gray)
            // K: absent (gray)
            const feedback = WordleEngine.evaluateGuess(guess, target);
            expect(feedback).toEqual(['correct', 'absent', 'absent', 'absent', 'absent']);

            const guess2 = 'OPERA';
            // O: present (yellow)
            // P: present (yellow)
            // E: present (yellow)
            // R: absent (gray)
            // A: absent (gray)
            const feedback2 = WordleEngine.evaluateGuess(guess2, target);
            expect(feedback2[0]).toBe('present');
            expect(feedback2[1]).toBe('present');
            expect(feedback2[2]).toBe('present');
        });
    });
});
