import { DailySeedEngine } from '../../engine/dailySeedEngine';

export class SlidePuzzleEngine {
    /**
     * Solved 4x4 state: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
     * where 0 represents the empty space.
     */
    public static getSolvedTiles(): number[] {
        return [...Array.from({ length: 15 }, (_, i) => i + 1), 0];
    }

    /**
     * Inversion count parity check for 4x4 grid:
     * A 4x4 board is solvable IF AND ONLY IF:
     * - (inversions + row of empty cell from bottom [1-indexed]) is ODD.
     * Explanation:
     * If blank is on an odd row counting from the bottom (e.g. bottom row 1), inversions must be EVEN.
     * If blank is on an even row counting from the bottom (e.g. row 2 or 4), inversions must be ODD.
     * In both solvable cases, (inversions + emptyRowFromBottom) % 2 === 1.
     */
    public static isSolvable(tiles: number[]): boolean {
        let inversions = 0;
        const nonZero = tiles.filter((t) => t !== 0);

        for (let i = 0; i < nonZero.length; i++) {
            for (let j = i + 1; j < nonZero.length; j++) {
                if (nonZero[i] > nonZero[j]) {
                    inversions++;
                }
            }
        }

        const emptyIndex = tiles.indexOf(0);
        const emptyRowFromTop = Math.floor(emptyIndex / 4);
        const emptyRowFromBottom = 4 - emptyRowFromTop;

        return (inversions + emptyRowFromBottom) % 2 === 1;
    }

    public static generateSolvableBoard(seedStr?: string): number[] {
        let tiles = this.getSolvedTiles();
        const prng = seedStr ? DailySeedEngine.createPrng(seedStr) : Math.random;

        let attempts = 0;
        while (attempts < 200) {
            attempts++;
            const candidate = DailySeedEngine.shuffle(tiles, prng);
            // Must be solvable and not already solved
            if (this.isSolvable(candidate) && !this.isSolved(candidate)) {
                return candidate;
            }
        }

        // Guaranteed solvable fallback by performing 40 random legal sliding moves from solved
        tiles = this.getSolvedTiles();
        let emptyIdx = 15;
        for (let step = 0; step < 40; step++) {
            const neighbors = this.getAdjacentIndices(emptyIdx);
            const chosen = neighbors[Math.floor(prng() * neighbors.length)];
            [tiles[emptyIdx], tiles[chosen]] = [tiles[chosen], tiles[emptyIdx]];
            emptyIdx = chosen;
        }

        return tiles;
    }

    public static getAdjacentIndices(index: number): number[] {
        const r = Math.floor(index / 4);
        const c = index % 4;
        const neighbors: number[] = [];

        if (r > 0) neighbors.push((r - 1) * 4 + c); // up
        if (r < 3) neighbors.push((r + 1) * 4 + c); // down
        if (c > 0) neighbors.push(r * 4 + (c - 1)); // left
        if (c < 3) neighbors.push(r * 4 + (c + 1)); // right

        return neighbors;
    }

    public static canMove(tileIndex: number, emptyIndex: number): boolean {
        const r1 = Math.floor(tileIndex / 4);
        const c1 = tileIndex % 4;
        const r2 = Math.floor(emptyIndex / 4);
        const c2 = emptyIndex % 4;
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    public static isSolved(tiles: number[]): boolean {
        for (let i = 0; i < 15; i++) {
            if (tiles[i] !== i + 1) return false;
        }
        return tiles[15] === 0;
    }
}
