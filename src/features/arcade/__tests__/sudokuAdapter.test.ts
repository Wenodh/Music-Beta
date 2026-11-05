import { describe, it, expect, vi } from 'vitest';
import { SudokuEngineAdapter } from '../games/sudoku/sudokuEngineAdapter';
import { SudokuEngine, SudokuPuzzle } from '../games/sudoku/sudokuEngine';
import * as sudokuCore from 'sudoku-core';

describe('SudokuEngineAdapter - Phase 1 Integration & Safety Gates', () => {
    const adapter = SudokuEngineAdapter.getInstance();

    describe('Generator Versioning & Backward Compatibility', () => {
        it('resolves legacy v1 version for seeds containing :v1: to preserve daily challenges', () => {
            const version = adapter.getGeneratorVersion('vibe-sudoku:v1:2026-11-05');
            expect(version).toBe('v1-legacy');
        });

        it('resolves v2-human version for non-v1 or v2 seeds', () => {
            const version = adapter.getGeneratorVersion('vibe-sudoku:v2:2026-11-05');
            expect(version).toBe('v2-human');
        });

        it('delegates to SudokuEngine directly when v1-legacy is requested', () => {
            const seed = 'vibe-sudoku:v1:2026-11-05';
            const spy = vi.spyOn(SudokuEngine, 'generatePuzzle');
            const puzzle = adapter.generatePuzzle('medium', seed, 'v1-legacy');
            expect(spy).toHaveBeenCalledWith('medium', seed);
            expect(puzzle.seed).toBe(seed);
            spy.mockRestore();
        });
    });

    describe('Actual sudoku-core v2 Generation & Independent Validation', () => {
        it('generates a valid, uniquely solvable puzzle using sudoku-core in v2', () => {
            const seed = 'practice_test_seed_101';
            const puzzle = adapter.generatePuzzle('easy', seed, 'v2-human');

            expect(puzzle.initialGrid.length).toBe(9);
            expect(puzzle.solution.length).toBe(9);

            // Independent validation gate should pass
            expect(adapter.validatePuzzle(puzzle)).toBe(true);

            // Double check uniqueness using SudokuEngine.countSolutions
            const copy = puzzle.initialGrid.map((r) => [...r]);
            const count = SudokuEngine.countSolutions(copy, { value: 0 });
            expect(count).toBe(1);
        });

        it('guarantees deterministic output for the same seed in v2', () => {
            const seed = 'v2_deterministic_test_seed';
            const p1 = adapter.generatePuzzle('medium', seed, 'v2-human');
            const p2 = adapter.generatePuzzle('medium', seed, 'v2-human');

            expect(p1.initialGrid).toEqual(p2.initialGrid);
            expect(p1.solution).toEqual(p2.solution);
        });
    });

    describe('Independent Validation Rejection & Safe Fallback', () => {
        it('rejects puzzle with invalid dimensions', () => {
            const badPuzzle: SudokuPuzzle = {
                initialGrid: [[1, 2, 3]],
                solution: [[1, 2, 3]],
                difficulty: 'easy',
                seed: 'bad',
            };
            expect(adapter.validatePuzzle(badPuzzle)).toBe(false);
        });

        it('rejects puzzle where initial clues conflict with the solution', () => {
            const valid = SudokuEngine.generatePuzzle('easy', 'test_seed_valid');
            const corrupted: SudokuPuzzle = {
                ...valid,
                initialGrid: valid.initialGrid.map((row) => [...row]),
            };
            // Corrupt a clue
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (corrupted.initialGrid[r][c] !== 0) {
                        corrupted.initialGrid[r][c] = corrupted.initialGrid[r][c] === 9 ? 1 : corrupted.initialGrid[r][c] + 1;
                        break;
                    }
                }
            }
            expect(adapter.validatePuzzle(corrupted)).toBe(false);
        });

        it('falls back safely to SudokuEngine when validation fails on candidate puzzle', () => {
            const fallbackSpy = vi.spyOn(SudokuEngine, 'generatePuzzle');
            const validateSpy = vi.spyOn(adapter, 'validatePuzzle').mockReturnValueOnce(false);

            const puzzle = adapter.generatePuzzle('medium', 'seed_validation_fail', 'v2-human');
            expect(validateSpy).toHaveBeenCalled();
            expect(fallbackSpy).toHaveBeenCalled();
            expect(puzzle.solution.length).toBe(9);

            validateSpy.mockRestore();
            fallbackSpy.mockRestore();
        });
    });

    describe('Human-Logic Hint Implementation', () => {
        it('returns a single valid hint with row, col, suggested value and explanation', () => {
            const puzzle = adapter.generatePuzzle('easy', 'hint_test_seed', 'v2-human');
            const hint = adapter.getHint(puzzle.initialGrid, puzzle.solution);

            expect(hint).not.toBeNull();
            if (hint) {
                expect(hint.row).toBeGreaterThanOrEqual(0);
                expect(hint.row).toBeLessThan(9);
                expect(hint.col).toBeGreaterThanOrEqual(0);
                expect(hint.col).toBeLessThan(9);
                expect(hint.value).toBe(puzzle.solution[hint.row][hint.col]);
                expect(puzzle.initialGrid[hint.row][hint.col]).toBe(0); // Must be an empty cell
                expect(hint.label.length).toBeGreaterThan(0);
                expect(hint.explanation.length).toBeGreaterThan(0);
            }
        });

        it('identifies and guides correction if user placed an incorrect number', () => {
            const puzzle = adapter.generatePuzzle('easy', 'hint_error_seed', 'v2-human');
            const userGrid = puzzle.initialGrid.map((r) => [...r]);

            // Find first empty cell and put wrong digit
            let errorR = -1;
            let errorC = -1;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (userGrid[r][c] === 0) {
                        const wrong = puzzle.solution[r][c] === 9 ? 1 : puzzle.solution[r][c] + 1;
                        userGrid[r][c] = wrong;
                        errorR = r;
                        errorC = c;
                        break;
                    }
                }
                if (errorR !== -1) break;
            }

            const hint = adapter.getHint(userGrid, puzzle.solution);
            expect(hint).not.toBeNull();
            if (hint) {
                expect(hint.row).toBe(errorR);
                expect(hint.col).toBe(errorC);
                expect(hint.value).toBe(puzzle.solution[errorR][errorC]);
                expect(hint.label).toBe('Correction Needed');
            }
        });

        it('returns null when the board is completely solved', () => {
            const puzzle = adapter.generatePuzzle('easy', 'solved_hint_test', 'v2-human');
            const hint = adapter.getHint(puzzle.solution, puzzle.solution);
            expect(hint).toBeNull();
        });
    });
});
