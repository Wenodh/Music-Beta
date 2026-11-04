import { DailySeedEngine } from '../../engine/dailySeedEngine';

export type TangoSymbol = 'sun' | 'moon' | null; // ☀️ = sun (0), 🌙 = moon (1)
export type TangoConstraint = '=' | 'x' | null; // '=' means equal, 'x' means opposite

export interface TangoConstraintMap {
    horizontal: TangoConstraint[][]; // size x (size - 1)
    vertical: TangoConstraint[][]; // (size - 1) x size
}

export interface TangoPuzzle {
    size: number;
    initialGrid: TangoSymbol[][];
    constraints: TangoConstraintMap;
    solution: ('sun' | 'moon')[][];
    seed: string;
}

export class TangoEngine {
    /**
     * Checks if placing symbol at (row, col) violates Tango rules:
     * 1. No more than 2 consecutive identical symbols in any row or column.
     * 2. Number of suns and moons in any full row/col must be equal (size / 2).
     * 3. Satisfies '=' (same) and 'x' (opposite) constraints.
     */
    public static validateBoard(
        grid: TangoSymbol[][],
        constraints: TangoConstraintMap
    ): { isValid: boolean; errors: Set<string> } {
        const size = grid.length;
        const errors = new Set<string>();
        const half = size / 2;

        // 1. Check rows for consecutive runs & counts
        for (let r = 0; r < size; r++) {
            let suns = 0;
            let moons = 0;
            for (let c = 0; c < size; c++) {
                const val = grid[r][c];
                if (val === 'sun') suns++;
                if (val === 'moon') moons++;

                // 3 in a row
                if (c >= 2 && val && val === grid[r][c - 1] && val === grid[r][c - 2]) {
                    errors.add(`${r},${c}`);
                    errors.add(`${r},${c - 1}`);
                    errors.add(`${r},${c - 2}`);
                }
            }
            if (suns > half || moons > half) {
                for (let c = 0; c < size; c++) errors.add(`${r},${c}`);
            }
        }

        // 2. Check cols for consecutive runs & counts
        for (let c = 0; c < size; c++) {
            let suns = 0;
            let moons = 0;
            for (let r = 0; r < size; r++) {
                const val = grid[r][c];
                if (val === 'sun') suns++;
                if (val === 'moon') moons++;

                // 3 in a col
                if (r >= 2 && val && val === grid[r - 1][c] && val === grid[r - 2][c]) {
                    errors.add(`${r},${c}`);
                    errors.add(`${r - 1},${c}`);
                    errors.add(`${r - 2},${c}`);
                }
            }
            if (suns > half || moons > half) {
                for (let r = 0; r < size; r++) errors.add(`${r},${c}`);
            }
        }

        // 3. Check constraints
        // Horizontal
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size - 1; c++) {
                const con = constraints.horizontal[r][c];
                const v1 = grid[r][c];
                const v2 = grid[r][c + 1];
                if (con && v1 && v2) {
                    if (con === '=' && v1 !== v2) {
                        errors.add(`${r},${c}`);
                        errors.add(`${r},${c + 1}`);
                    } else if (con === 'x' && v1 === v2) {
                        errors.add(`${r},${c}`);
                        errors.add(`${r},${c + 1}`);
                    }
                }
            }
        }

        // Vertical
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size; c++) {
                const con = constraints.vertical[r][c];
                const v1 = grid[r][c];
                const v2 = grid[r + 1][c];
                if (con && v1 && v2) {
                    if (con === '=' && v1 !== v2) {
                        errors.add(`${r},${c}`);
                        errors.add(`${r + 1},${c}`);
                    } else if (con === 'x' && v1 === v2) {
                        errors.add(`${r},${c}`);
                        errors.add(`${r + 1},${c}`);
                    }
                }
            }
        }

        return { isValid: errors.size === 0, errors };
    }

    /**
     * Checks if board is completely filled and fully valid.
     */
    public static isSolved(
        grid: TangoSymbol[][],
        constraints: TangoConstraintMap
    ): boolean {
        const size = grid.length;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (!grid[r][c]) return false;
            }
        }
        const { isValid } = this.validateBoard(grid, constraints);
        return isValid;
    }

    /**
     * Generates a 6x6 Tango puzzle from a seed.
     */
    public static generatePuzzle(seedStr: string): TangoPuzzle {
        const size = 6;
        const prng = DailySeedEngine.createPrng(seedStr);

        // Pre-validated valid 6x6 binary grids to guarantee immediate solvable boards
        const baseSolutions: ('sun' | 'moon')[][][] = [
            [
                ['sun', 'moon', 'sun', 'moon', 'moon', 'sun'],
                ['moon', 'sun', 'moon', 'sun', 'sun', 'moon'],
                ['sun', 'sun', 'moon', 'moon', 'sun', 'moon'],
                ['moon', 'moon', 'sun', 'sun', 'moon', 'sun'],
                ['moon', 'sun', 'sun', 'moon', 'sun', 'moon'],
                ['sun', 'moon', 'moon', 'sun', 'moon', 'sun'],
            ],
            [
                ['sun', 'sun', 'moon', 'moon', 'sun', 'moon'],
                ['moon', 'moon', 'sun', 'sun', 'moon', 'sun'],
                ['sun', 'moon', 'sun', 'moon', 'sun', 'moon'],
                ['moon', 'sun', 'moon', 'sun', 'moon', 'sun'],
                ['sun', 'moon', 'moon', 'sun', 'moon', 'sun'],
                ['moon', 'sun', 'sun', 'moon', 'sun', 'moon'],
            ],
        ];

        const solIndex = Math.floor(prng() * baseSolutions.length);
        const solution = baseSolutions[solIndex].map(row => [...row]);

        // Generate constraints based on the chosen solution
        const horizontal: TangoConstraint[][] = Array.from({ length: size }, () => Array(size - 1).fill(null));
        const vertical: TangoConstraint[][] = Array.from({ length: size - 1 }, () => Array(size).fill(null));

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size - 1; c++) {
                if (prng() < 0.28) {
                    horizontal[r][c] = solution[r][c] === solution[r][c + 1] ? '=' : 'x';
                }
            }
        }

        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size; c++) {
                if (prng() < 0.28) {
                    vertical[r][c] = solution[r][c] === solution[r + 1][c] ? '=' : 'x';
                }
            }
        }

        // Give a few starting symbols (around 8-10 cells)
        const initialGrid: TangoSymbol[][] = Array.from({ length: size }, () => Array(size).fill(null));
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (prng() < 0.3) {
                    initialGrid[r][c] = solution[r][c];
                }
            }
        }

        return {
            size,
            initialGrid,
            constraints: { horizontal, vertical },
            solution,
            seed: seedStr,
        };
    }
}
