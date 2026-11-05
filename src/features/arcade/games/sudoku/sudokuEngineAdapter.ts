import { generate, solve, teachHint } from 'sudoku-core';
import { SudokuEngine, SudokuPuzzle, SudokuDifficulty } from './sudokuEngine';

export type SudokuGeneratorVersion = 'v1-legacy' | 'v2-human';

export interface SudokuHintResult {
    row: number;
    col: number;
    value: number;
    label: string; // e.g. "Naked Single", "Hidden Single", "Direct Placement"
    explanation: string;
}

export interface ISudokuEngineAdapter {
    generatePuzzle(
        difficulty: SudokuDifficulty,
        seedStr: string,
        version?: SudokuGeneratorVersion
    ): SudokuPuzzle;
    getHint(grid: number[][], solution: number[][]): SudokuHintResult | null;
    validatePuzzle(puzzle: SudokuPuzzle): boolean;
    getGeneratorVersion(seedStr: string): SudokuGeneratorVersion;
}

export class SudokuEngineAdapter implements ISudokuEngineAdapter {
    private static instance: SudokuEngineAdapter;

    public static getInstance(): SudokuEngineAdapter {
        if (!this.instance) {
            this.instance = new SudokuEngineAdapter();
        }
        return this.instance;
    }

    /**
     * Resolves the generator version based on seed format.
     * Legacy daily challenges ("...:v1:...") or explicitly requested 'v1-legacy'
     * use our verified legacy SudokuEngine to preserve 100% backward compatibility.
     * New challenges with version "v2" or non-v1 seeds use the human-logic engine.
     */
    public getGeneratorVersion(seedStr: string): SudokuGeneratorVersion {
        if (seedStr.includes(':v1:') || seedStr.startsWith('v1-')) {
            return 'v1-legacy';
        }
        return 'v2-human';
    }

    /**
     * Converts a string seed into a positive 32-bit integer for external engines.
     */
    public static hashSeedToNumber(seedStr: string): number {
        let h = 0;
        for (let i = 0; i < seedStr.length; i++) {
            h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
        }
        return Math.abs(h >>> 0);
    }

    /**
     * Maps user-facing difficulty to sudoku-core's rated level tiers.
     * Easy -> L1 (singles only)
     * Medium -> L3 (pairs, intersections)
     * Hard -> L5 (advanced human techniques)
     */
    private mapDifficultyToLevel(difficulty: SudokuDifficulty): 'L1' | 'L3' | 'L5' {
        switch (difficulty) {
            case 'easy':
                return 'L1';
            case 'hard':
                return 'L5';
            case 'medium':
            default:
                return 'L3';
        }
    }

    /**
     * Converts 81-length flat board (with 0 or null for empty) to 9x9 2D array.
     */
    private flatTo2D(flat: (number | null)[]): number[][] {
        const grid: number[][] = [];
        for (let r = 0; r < 9; r++) {
            const row: number[] = [];
            for (let c = 0; c < 9; c++) {
                const val = flat[r * 9 + c];
                row.push(val === null || val === undefined ? 0 : Number(val));
            }
            grid.push(row);
        }
        return grid;
    }

    /**
     * Converts 9x9 2D array to flat 81-length array (using 0 for empty).
     */
    private twoDToFlat(grid: number[][]): number[] {
        const flat: number[] = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                flat.push(grid[r][c]);
            }
        }
        return flat;
    }

    /**
     * Strict independent puzzle validator:
     * 1. Dimensions: 9x9 for both initialGrid and solution.
     * 2. Value domains: 0-9 for initialGrid, 1-9 for solution.
     * 3. Row, Col, Box validity of solution.
     * 4. Clue preservation: initialGrid values match solution.
     * 5. Uniqueness: exactly 1 solution via independent countSolutions() (stopping after 2).
     */
    public validatePuzzle(puzzle: SudokuPuzzle): boolean {
        try {
            if (!puzzle || !puzzle.initialGrid || !puzzle.solution) return false;
            if (puzzle.initialGrid.length !== 9 || puzzle.solution.length !== 9) return false;

            let cluesCount = 0;
            for (let r = 0; r < 9; r++) {
                if (puzzle.initialGrid[r].length !== 9 || puzzle.solution[r].length !== 9) {
                    return false;
                }
                for (let c = 0; c < 9; c++) {
                    const initVal = puzzle.initialGrid[r][c];
                    const solVal = puzzle.solution[r][c];

                    if (solVal < 1 || solVal > 9) return false;
                    if (initVal < 0 || initVal > 9) return false;

                    if (initVal !== 0) {
                        if (initVal !== solVal) return false; // Inconsistency
                        cluesCount++;
                    }
                }
            }

            // Normal Sudoku puzzles require at least 17 clues to be uniquely solvable
            if (cluesCount < 17 || cluesCount > 60) return false;

            // Verify solution validity
            if (!SudokuEngine.isSolved(puzzle.solution, puzzle.solution)) {
                return false;
            }

            // Independent uniqueness validation:
            const copy = puzzle.initialGrid.map((row) => [...row]);
            const solCount = SudokuEngine.countSolutions(copy, { value: 0 });
            if (solCount !== 1) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Generates a puzzle using either v1-legacy (SudokuEngine) or v2-human (sudoku-core).
     * If v2 generation or validation fails, it safely falls back to v1-legacy.
     */
    public generatePuzzle(
        difficulty: SudokuDifficulty = 'medium',
        seedStr: string,
        explicitVersion?: SudokuGeneratorVersion
    ): SudokuPuzzle {
        const version = explicitVersion || this.getGeneratorVersion(seedStr);

        // 1. If v1-legacy is required (e.g. historical daily challenge), use SudokuEngine
        if (version === 'v1-legacy') {
            return SudokuEngine.generatePuzzle(difficulty, seedStr);
        }

        // 2. Attempt v2-human generation via sudoku-core
        try {
            const numericSeed = SudokuEngineAdapter.hashSeedToNumber(seedStr);
            const level = this.mapDifficultyToLevel(difficulty);

            // Cap execution time safely
            const rawFlat = generate(level, {
                seed: numericSeed,
                timeoutMs: 3000,
                maxAttempts: 100,
            });

            if (!rawFlat || rawFlat.length !== 81) {
                throw new Error('sudoku-core produced invalid board length');
            }

            const initialGrid = this.flatTo2D(rawFlat);

            // Compute solved board
            const solvedResult = solve(rawFlat);
            if (!solvedResult || !solvedResult.solved || !solvedResult.board) {
                throw new Error('sudoku-core solve failed to find unique solution');
            }

            const solution = this.flatTo2D(solvedResult.board);

            const candidatePuzzle: SudokuPuzzle = {
                initialGrid,
                solution,
                difficulty,
                seed: seedStr,
            };

            // Independent uniqueness & structural validation
            const isValid = this.validatePuzzle(candidatePuzzle);
            if (!isValid) {
                console.warn('[SudokuAdapter] Independent validation failed on v2 puzzle, falling back to v1 engine.');
                return SudokuEngine.generatePuzzle(difficulty, seedStr);
            }

            return candidatePuzzle;
        } catch (err) {
            console.warn('[SudokuAdapter] Exception during v2 puzzle generation, falling back to v1 engine:', err);
            return SudokuEngine.generatePuzzle(difficulty, seedStr);
        }
    }

    /**
     * Returns a valid next single-step hint using sudoku-core's teachHint engine.
     * Falls back to standard solution lookup if teachHint cannot produce a step.
     * Never reveals the entire solution; returns only one cell and explanation.
     */
    public getHint(grid: number[][], solution: number[][]): SudokuHintResult | null {
        // Find empty cells
        const emptyCells: { r: number; c: number }[] = [];
        let hasConflict = false;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                if (val === 0) {
                    emptyCells.push({ r, c });
                } else if (val !== solution[r][c]) {
                    hasConflict = true;
                }
            }
        }

        // Board is already completed
        if (emptyCells.length === 0) return null;

        // If the player has made errors, hint the first conflicting cell
        if (hasConflict) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const val = grid[r][c];
                    if (val !== 0 && val !== solution[r][c]) {
                        return {
                            row: r,
                            col: c,
                            value: solution[r][c],
                            label: 'Correction Needed',
                            explanation: `Cell (${r + 1}, ${c + 1}) has an incorrect digit. It should be ${solution[r][c]}.`,
                        };
                    }
                }
            }
        }

        // Use human-logic teachHint from sudoku-core
        try {
            const flat = this.twoDToFlat(grid);
            const teach = teachHint(flat);

            if (teach && teach.focusCell !== undefined && teach.focusCell >= 0 && teach.focusCell < 81) {
                const r = Math.floor(teach.focusCell / 9);
                const c = teach.focusCell % 9;
                const correctVal = solution[r][c];

                if (grid[r][c] === 0) {
                    return {
                        row: r,
                        col: c,
                        value: correctVal,
                        label: teach.label || teach.strategy || 'Human Logic Hint',
                        explanation: teach.explanation || `By logic analysis, cell (${r + 1}, ${c + 1}) must be ${correctVal}.`,
                    };
                }
            }
        } catch {
            // If teachHint throws on custom/intermediate state, fallback gracefully
        }

        // Fallback: Pick the first empty cell with the fewest candidates or first available
        const target = emptyCells[0];
        return {
            row: target.r,
            col: target.c,
            value: solution[target.r][target.c],
            label: 'Next Move',
            explanation: `Focus on cell (${target.r + 1}, ${target.c + 1}). The solution requires ${solution[target.r][target.c]}.`,
        };
    }
}
