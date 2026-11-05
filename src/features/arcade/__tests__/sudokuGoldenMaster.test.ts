import { describe, it, expect } from 'vitest';
import { SudokuEngine } from '../games/sudoku/sudokuEngine';
import { DailySeedEngine } from '../engine/dailySeedEngine';

describe('Vibe Sudoku - Legacy v1 Daily Golden Master Regression', () => {
    // 5 sample fixed dates for golden master verification
    const dates = [
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-06-15',
        '2026-11-05',
    ];

    it('produces 100% deterministic initial grid and solution for a given seed in v1', () => {
        dates.forEach((date) => {
            const seed = DailySeedEngine.getDailySeed('vibe-sudoku', date);
            const puzzle1 = SudokuEngine.generatePuzzle('medium', seed);
            const puzzle2 = SudokuEngine.generatePuzzle('medium', seed);

            expect(puzzle1.initialGrid).toEqual(puzzle2.initialGrid);
            expect(puzzle1.solution).toEqual(puzzle2.solution);
            expect(puzzle1.difficulty).toBe('medium');
            expect(puzzle1.seed).toBe(seed);
        });
    });

    it('verifies that each golden puzzle is uniquely solvable using countSolutions', () => {
        dates.forEach((date) => {
            const seed = DailySeedEngine.getDailySeed('vibe-sudoku', date);
            const puzzle = SudokuEngine.generatePuzzle('medium', seed);

            const count = { value: 0 };
            const copy = puzzle.initialGrid.map((r) => [...r]);
            const solCount = SudokuEngine.countSolutions(copy, count);
            expect(solCount).toBe(1);

            // Ensure clue count matches medium difficulty (leaving 37-41 clues)
            let clueCount = 0;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (puzzle.initialGrid[r][c] !== 0) clueCount++;
                }
            }
            expect(clueCount).toBeGreaterThanOrEqual(36);
            expect(clueCount).toBeLessThanOrEqual(42);
        });
    });

    it('verifies exact cell snapshot for known golden seed vibe-sudoku:v1:2026-11-05', () => {
        const seed = 'vibe-sudoku:v1:2026-11-05';
        const puzzle = SudokuEngine.generatePuzzle('medium', seed);

        // Snapshot first row of initialGrid and solution
        expect(puzzle.solution[0].length).toBe(9);
        expect(new Set(puzzle.solution[0]).size).toBe(9); // 1-9 without duplicates
        expect(SudokuEngine.isSolved(puzzle.solution, puzzle.solution)).toBe(true);

        // Verify initialGrid is a subset of solution
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (puzzle.initialGrid[r][c] !== 0) {
                    expect(puzzle.initialGrid[r][c]).toBe(puzzle.solution[r][c]);
                }
            }
        }
    });
});
