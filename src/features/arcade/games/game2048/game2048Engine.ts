export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Board2048 {
    grid: number[][]; // 4x4 grid of numbers (0 for empty)
    score: number;
    moved: boolean;
    mergedPoints: number;
}

export class Game2048Engine {
    public static createEmptyGrid(): number[][] {
        return Array.from({ length: 4 }, () => Array(4).fill(0));
    }

    public static spawnRandomTile(grid: number[][], prng: () => number = Math.random): { grid: number[][]; spawned: boolean } {
        const next = grid.map((r) => [...r]);
        const emptyCells: { r: number; c: number }[] = [];

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (next[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length === 0) {
            return { grid: next, spawned: false };
        }

        const chosenIndex = Math.floor(prng() * emptyCells.length);
        const { r, c } = emptyCells[chosenIndex];
        // 90% chance of 2, 10% chance of 4
        next[r][c] = prng() < 0.9 ? 2 : 4;
        return { grid: next, spawned: true };
    }

    public static slideAndMergeRow(row: number[]): { newRow: number[]; points: number } {
        const filtered = row.filter((v) => v !== 0);
        const newRow: number[] = [];
        let points = 0;
        let i = 0;

        while (i < filtered.length) {
            if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
                const mergedVal = filtered[i] * 2;
                newRow.push(mergedVal);
                points += mergedVal;
                i += 2;
            } else {
                newRow.push(filtered[i]);
                i += 1;
            }
        }

        while (newRow.length < 4) {
            newRow.push(0);
        }

        return { newRow, points };
    }

    public static move(grid: number[][], direction: Direction): Board2048 {
        let currentGrid = grid.map((r) => [...r]);
        let totalPoints = 0;

        // Helper to rotate grid clockwise
        const rotate = (g: number[][]): number[][] => {
            const res = Game2048Engine.createEmptyGrid();
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    res[c][3 - r] = g[r][c];
                }
            }
            return res;
        };

        // Normalize to 'left' movement by rotating
        let rotations = 0;
        if (direction === 'up') rotations = 3;
        else if (direction === 'right') rotations = 2;
        else if (direction === 'down') rotations = 1;

        for (let i = 0; i < rotations; i++) {
            currentGrid = rotate(currentGrid);
        }

        // Slide left
        const newRotatedGrid: number[][] = [];
        for (let r = 0; r < 4; r++) {
            const { newRow, points } = this.slideAndMergeRow(currentGrid[r]);
            newRotatedGrid.push(newRow);
            totalPoints += points;
        }

        // Rotate back
        let resultGrid = newRotatedGrid;
        const unrotations = (4 - rotations) % 4;
        for (let i = 0; i < unrotations; i++) {
            resultGrid = rotate(resultGrid);
        }

        // Check if anything actually moved
        let moved = false;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] !== resultGrid[r][c]) {
                    moved = true;
                    break;
                }
            }
            if (moved) break;
        }

        return {
            grid: resultGrid,
            score: totalPoints,
            moved,
            mergedPoints: totalPoints,
        };
    }

    public static isGameOver(grid: number[][]): boolean {
        // Any empty cell?
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) return false;
            }
        }

        // Any adjacent merges possible horizontally or vertically?
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = grid[r][c];
                if (r < 3 && val === grid[r + 1][c]) return false;
                if (c < 3 && val === grid[r][c + 1]) return false;
            }
        }

        return true;
    }
}
