import { DailySeedEngine } from '../../engine/dailySeedEngine';

export type QueensCellState = 'empty' | 'crown' | 'x';

export interface QueensPuzzle {
    size: number;
    regions: number[][]; // 2D array of region IDs (0 to size-1)
    solution: { r: number; c: number }[];
    seed: string;
}

export class QueensEngine {
    /**
     * Checks if placing a queen at (row, col) is valid according to Queens rules:
     * 1. Only 1 queen per row
     * 2. Only 1 queen per column
     * 3. Only 1 queen per color territory/region
     * 4. No two queens touch horizontally, vertically, or diagonally (adjacent 8 cells).
     */
    public static isValidPlacement(
        board: QueensCellState[][],
        regions: number[][],
        row: number,
        col: number
    ): boolean {
        const size = board.length;
        const targetRegion = regions[row][col];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'crown') {
                    if (r === row && c === col) continue;

                    // Same row or col
                    if (r === row || c === col) return false;

                    // Same region
                    if (regions[r][c] === targetRegion) return false;

                    // Touching in 8 directions (distance <= 1)
                    if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return false;
                }
            }
        }
        return true;
    }

    /**
     * Finds conflicting cells on the current board.
     * Returns a set of `${r},${c}` keys that violate rules.
     */
    public static findConflicts(
        board: QueensCellState[][],
        regions: number[][]
    ): Set<string> {
        const size = board.length;
        const conflicts = new Set<string>();
        const crowns: { r: number; c: number }[] = [];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'crown') {
                    crowns.push({ r, c });
                }
            }
        }

        for (let i = 0; i < crowns.length; i++) {
            for (let j = i + 1; j < crowns.length; j++) {
                const q1 = crowns[i];
                const q2 = crowns[j];

                const sameRow = q1.r === q2.r;
                const sameCol = q1.c === q2.c;
                const sameRegion = regions[q1.r][q1.c] === regions[q2.r][q2.c];
                const adjacent = Math.abs(q1.r - q2.r) <= 1 && Math.abs(q1.c - q2.c) <= 1;

                if (sameRow || sameCol || sameRegion || adjacent) {
                    conflicts.add(`${q1.r},${q1.c}`);
                    conflicts.add(`${q2.r},${q2.c}`);
                }
            }
        }

        return conflicts;
    }

    /**
     * Checks if board has won:
     * Exactly size crowns placed with 0 conflicts and every region having 1 crown.
     */
    public static isSolved(
        board: QueensCellState[][],
        regions: number[][]
    ): boolean {
        const size = board.length;
        let crownCount = 0;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'crown') crownCount++;
            }
        }

        if (crownCount !== size) return false;

        const conflicts = this.findConflicts(board, regions);
        return conflicts.size === 0;
    }

    /**
     * Generates a solvable Queens puzzle deterministically from a seed.
     * Guaranteed solvable because regions are grown around a valid non-touching queen placement.
     */
    public static generatePuzzle(size: number = 6, seedStr: string): QueensPuzzle {
        const prng = DailySeedEngine.createPrng(seedStr);

        // 1. Find a valid queen placement where no two queens touch diagonally/adjacently
        let solution: { r: number; c: number }[] = [];
        let attempts = 0;

        while (attempts < 500) {
            attempts++;
            const cols = DailySeedEngine.shuffle(
                Array.from({ length: size }, (_, i) => i),
                prng
            );

            let valid = true;
            for (let r = 0; r < size; r++) {
                for (let prevR = 0; prevR < r; prevR++) {
                    const c1 = cols[prevR];
                    const c2 = cols[r];
                    // Non-touching horizontally/vertically (guaranteed by permutation) and adjacent 8-ways:
                    if (Math.abs(r - prevR) <= 1 && Math.abs(c1 - c2) <= 1) {
                        valid = false;
                        break;
                    }
                }
                if (!valid) break;
            }

            if (valid) {
                solution = cols.map((c, r) => ({ r, c }));
                break;
            }
        }

        // Fallback guaranteed placement for 6x6 if random search takes long
        if (solution.length === 0) {
            solution = [
                { r: 0, c: 1 },
                { r: 1, c: 3 },
                { r: 2, c: 5 },
                { r: 3, c: 0 },
                { r: 4, c: 2 },
                { r: 5, c: 4 },
            ];
        }

        // 2. Grow contiguous regions around each queen cell (Voronoi/BFS growth)
        const regions: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
        const queue: { r: number; c: number; region: number }[] = [];

        solution.forEach((pos, regionIdx) => {
            regions[pos.r][pos.c] = regionIdx;
            queue.push({ r: pos.r, c: pos.c, region: regionIdx });
        });

        const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];

        while (queue.length > 0) {
            // Pick random element from queue to ensure organic shapes
            const qIdx = Math.floor(prng() * queue.length);
            const { r, c, region } = queue.splice(qIdx, 1)[0];

            for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === -1) {
                    regions[nr][nc] = region;
                    queue.push({ r: nr, c: nc, region });
                }
            }
        }

        return {
            size,
            regions,
            solution,
            seed: seedStr,
        };
    }
}
