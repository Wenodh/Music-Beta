export type SweeperDifficulty = 'beginner' | 'intermediate' | 'expert';

export interface SweeperConfig {
    rows: number;
    cols: number;
    mines: number;
}

export const SWEEPER_CONFIGS: Record<SweeperDifficulty, SweeperConfig> = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
};

export interface CellState {
    r: number;
    c: number;
    isMine: boolean;
    adjacentMines: number;
    isRevealed: boolean;
    isFlagged: boolean;
}

export class SoundSweeperEngine {
    public static createBoard(config: SweeperConfig): CellState[][] {
        const board: CellState[][] = [];
        for (let r = 0; r < config.rows; r++) {
            const row: CellState[] = [];
            for (let c = 0; c < config.cols; c++) {
                row.push({
                    r,
                    c,
                    isMine: false,
                    adjacentMines: 0,
                    isRevealed: false,
                    isFlagged: false,
                });
            }
            board.push(row);
        }
        return board;
    }

    /**
     * Places mines safely AFTER the user's first click, ensuring (firstR, firstC)
     * and its 8 adjacent neighbors never contain mines.
     */
    public static placeMinesSafely(
        board: CellState[][],
        config: SweeperConfig,
        firstR: number,
        firstC: number,
        prng: () => number = Math.random
    ): CellState[][] {
        const next = board.map((r) => r.map((c) => ({ ...c })));
        const candidates: { r: number; c: number }[] = [];

        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                // Must not be first click or adjacent to first click for a comfortable open start
                if (Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1) {
                    continue;
                }
                candidates.push({ r, c });
            }
        }

        // Shuffle candidates and pick mines
        let minesPlaced = 0;
        const available = [...candidates];
        while (minesPlaced < config.mines && available.length > 0) {
            const idx = Math.floor(prng() * available.length);
            const { r, c } = available.splice(idx, 1)[0];
            next[r][c].isMine = true;
            minesPlaced++;
        }

        // Calculate adjacent counts
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (next[r][c].isMine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
                            if (next[nr][nc].isMine) count++;
                        }
                    }
                }
                next[r][c].adjacentMines = count;
            }
        }

        return next;
    }

    /**
     * Reveals cell at (r, c). If adjacentMines is 0, cascades / flood-fills neighboring cells.
     * Returns { nextBoard, hitMine, newlyRevealedCount }.
     */
    public static revealCell(
        board: CellState[][],
        r: number,
        c: number
    ): { nextBoard: CellState[][]; hitMine: boolean; newlyRevealedCount: number } {
        const rows = board.length;
        const cols = board[0].length;
        const next = board.map((row) => row.map((cell) => ({ ...cell })));

        const target = next[r][c];
        if (target.isRevealed || target.isFlagged) {
            return { nextBoard: next, hitMine: false, newlyRevealedCount: 0 };
        }

        if (target.isMine) {
            target.isRevealed = true;
            return { nextBoard: next, hitMine: true, newlyRevealedCount: 1 };
        }

        let newlyRevealed = 0;
        const queue: { r: number; c: number }[] = [{ r, c }];
        target.isRevealed = true;
        newlyRevealed++;

        while (queue.length > 0) {
            const current = queue.shift()!;
            const cell = next[current.r][current.c];

            if (cell.adjacentMines === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = current.r + dr;
                        const nc = current.c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            const neighbor = next[nr][nc];
                            if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
                                neighbor.isRevealed = true;
                                newlyRevealed++;
                                if (neighbor.adjacentMines === 0) {
                                    queue.push({ r: nr, c: nc });
                                }
                            }
                        }
                    }
                }
            }
        }

        return { nextBoard: next, hitMine: false, newlyRevealedCount: newlyRevealed };
    }

    /**
     * Checks if player has won: all non-mine cells are revealed.
     */
    public static checkWin(board: CellState[][]): boolean {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const cell = board[r][c];
                if (!cell.isMine && !cell.isRevealed) {
                    return false;
                }
            }
        }
        return true;
    }
}
