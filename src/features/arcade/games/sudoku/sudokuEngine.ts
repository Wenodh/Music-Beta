import { DailySeedEngine } from '../../engine/dailySeedEngine';

export type SudokuDifficulty = 'easy' | 'medium' | 'hard';

export interface SudokuPuzzle {
    initialGrid: number[][]; // 0 for empty
    solution: number[][];
    difficulty: SudokuDifficulty;
    seed: string;
}

export class SudokuEngine {
    public static createEmptyGrid(): number[][] {
        return Array.from({ length: 9 }, () => Array(9).fill(0));
    }

    public static isValid(grid: number[][], row: number, col: number, num: number): boolean {
        // Row check
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === num) return false;
        }

        // Col check
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === num) return false;
        }

        // 3x3 Box check
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[startRow + r][startCol + c] === num) return false;
            }
        }

        return true;
    }

    public static solve(grid: number[][]): boolean {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (this.solve(grid)) return true;
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Counts the number of solutions to guarantee puzzle uniqueness (stopping early if > 1).
     */
    public static countSolutions(grid: number[][], count = { value: 0 }): number {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            this.countSolutions(grid, count);
                            grid[r][c] = 0;
                            if (count.value >= 2) return count.value;
                        }
                    }
                    return count.value;
                }
            }
        }
        count.value += 1;
        return count.value;
    }

    public static generateSolvedBoard(prng: () => number): number[][] {
        const grid = this.createEmptyGrid();

        // Fill 3 diagonal 3x3 boxes independently since they don't affect each other
        for (let box = 0; box < 9; box += 3) {
            const nums = DailySeedEngine.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], prng);
            let idx = 0;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    grid[box + r][box + c] = nums[idx++];
                }
            }
        }

        // Solve the rest
        this.solve(grid);
        return grid;
    }

    public static generatePuzzle(
        difficulty: SudokuDifficulty = 'medium',
        seedStr: string
    ): SudokuPuzzle {
        const prng = DailySeedEngine.createPrng(seedStr);
        const solved = this.generateSolvedBoard(prng);
        const puzzle = solved.map((r) => [...r]);

        // Target clues to remove based on difficulty:
        // Easy: 32-36 removed (leaves 45-49 clues)
        // Medium: 40-44 removed (leaves 37-41 clues)
        // Hard: 48-52 removed (leaves 29-33 clues)
        let cluesToRemove = 34;
        if (difficulty === 'medium') cluesToRemove = 42;
        if (difficulty === 'hard') cluesToRemove = 50;

        const positions: { r: number; c: number }[] = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push({ r, c });
            }
        }
        const shuffledPositions = DailySeedEngine.shuffle(positions, prng);

        let removed = 0;
        for (const pos of shuffledPositions) {
            if (removed >= cluesToRemove) break;
            const temp = puzzle[pos.r][pos.c];
            puzzle[pos.r][pos.c] = 0;

            // Check if still uniquely solvable
            const count = { value: 0 };
            const copy = puzzle.map((row) => [...row]);
            this.countSolutions(copy, count);

            if (count.value === 1) {
                removed++;
            } else {
                // Restore to maintain uniqueness
                puzzle[pos.r][pos.c] = temp;
            }
        }

        return {
            initialGrid: puzzle,
            solution: solved,
            difficulty,
            seed: seedStr,
        };
    }

    public static isSolved(grid: number[][], solution: number[][]): boolean {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0 || grid[r][c] !== solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }
}
