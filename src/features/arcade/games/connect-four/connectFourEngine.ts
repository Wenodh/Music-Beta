export type ConnectFourCell = 'R' | 'Y' | null; // Red (Player 1) or Yellow (Player 2 / Bot)

export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLS = 7;

export class ConnectFourEngine {
    public static createEmptyBoard(): ConnectFourCell[][] {
        return Array.from({ length: CONNECT_FOUR_ROWS }, () => Array(CONNECT_FOUR_COLS).fill(null));
    }

    /**
     * Finds the lowest available row in a column (gravity simulation).
     * Returns -1 if column is completely full.
     */
    public static getLowestEmptyRow(board: ConnectFourCell[][], col: number): number {
        if (col < 0 || col >= CONNECT_FOUR_COLS) return -1;
        for (let r = CONNECT_FOUR_ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) {
                return r;
            }
        }
        return -1;
    }

    /**
     * Drops a disc into column `col`. Returns { newBoard, rowPlaced, success }.
     */
    public static dropDisc(
        board: ConnectFourCell[][],
        col: number,
        player: 'R' | 'Y'
    ): { newBoard: ConnectFourCell[][]; rowPlaced: number; success: boolean } {
        const row = this.getLowestEmptyRow(board, col);
        if (row === -1) {
            return { newBoard: board, rowPlaced: -1, success: false };
        }

        const newBoard = board.map((r) => [...r]);
        newBoard[row][col] = player;
        return { newBoard, rowPlaced: row, success: true };
    }

    /**
     * Checks if either player has 4 in a row horizontally, vertically, or diagonally.
     */
    public static checkWinner(board: ConnectFourCell[][]): {
        winner: 'R' | 'Y' | 'draw' | null;
        winningCells: { r: number; c: number }[] | null;
    } {
        // Horizontal check
        for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
            for (let c = 0; c <= CONNECT_FOUR_COLS - 4; c++) {
                const cell = board[r][c];
                if (
                    cell &&
                    cell === board[r][c + 1] &&
                    cell === board[r][c + 2] &&
                    cell === board[r][c + 3]
                ) {
                    return {
                        winner: cell,
                        winningCells: [
                            { r, c },
                            { r, c: c + 1 },
                            { r, c: c + 2 },
                            { r, c: c + 3 },
                        ],
                    };
                }
            }
        }

        // Vertical check
        for (let r = 0; r <= CONNECT_FOUR_ROWS - 4; r++) {
            for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
                const cell = board[r][c];
                if (
                    cell &&
                    cell === board[r + 1][c] &&
                    cell === board[r + 2][c] &&
                    cell === board[r + 3][c]
                ) {
                    return {
                        winner: cell,
                        winningCells: [
                            { r, c },
                            { r: r + 1, c },
                            { r: r + 2, c },
                            { r: r + 3, c },
                        ],
                    };
                }
            }
        }

        // Diagonal (down-right \)
        for (let r = 0; r <= CONNECT_FOUR_ROWS - 4; r++) {
            for (let c = 0; c <= CONNECT_FOUR_COLS - 4; c++) {
                const cell = board[r][c];
                if (
                    cell &&
                    cell === board[r + 1][c + 1] &&
                    cell === board[r + 2][c + 2] &&
                    cell === board[r + 3][c + 3]
                ) {
                    return {
                        winner: cell,
                        winningCells: [
                            { r, c },
                            { r: r + 1, c: c + 1 },
                            { r: r + 2, c: c + 2 },
                            { r: r + 3, c: c + 3 },
                        ],
                    };
                }
            }
        }

        // Diagonal (up-right /)
        for (let r = 3; r < CONNECT_FOUR_ROWS; r++) {
            for (let c = 0; c <= CONNECT_FOUR_COLS - 4; c++) {
                const cell = board[r][c];
                if (
                    cell &&
                    cell === board[r - 1][c + 1] &&
                    cell === board[r - 2][c + 2] &&
                    cell === board[r - 3][c + 3]
                ) {
                    return {
                        winner: cell,
                        winningCells: [
                            { r, c },
                            { r: r - 1, c: c + 1 },
                            { r: r - 2, c: c + 2 },
                            { r: r - 3, c: c + 3 },
                        ],
                    };
                }
            }
        }

        // Check for full board (draw)
        const isFull = board[0].every((cell) => cell !== null);
        if (isFull) {
            return { winner: 'draw', winningCells: null };
        }

        return { winner: null, winningCells: null };
    }

    public static getValidColumns(board: ConnectFourCell[][]): number[] {
        const cols: number[] = [];
        for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
            if (board[0][c] === null) {
                cols.push(c);
            }
        }
        return cols;
    }

    /**
     * Heuristic evaluation of a 4-cell window for minimax pruning.
     */
    private static evaluateWindow(window: ConnectFourCell[], bot: 'R' | 'Y', human: 'R' | 'Y'): number {
        let score = 0;
        const botCount = window.filter((c) => c === bot).length;
        const emptyCount = window.filter((c) => c === null).length;
        const humanCount = window.filter((c) => c === human).length;

        if (botCount === 4) score += 1000;
        else if (botCount === 3 && emptyCount === 1) score += 10;
        else if (botCount === 2 && emptyCount === 2) score += 4;

        if (humanCount === 3 && emptyCount === 1) score -= 80; // strong block imperative

        return score;
    }

    public static scoreBoard(board: ConnectFourCell[][], bot: 'R' | 'Y'): number {
        const human = bot === 'R' ? 'Y' : 'R';
        let totalScore = 0;

        // Center column preference
        const centerCol = Math.floor(CONNECT_FOUR_COLS / 2);
        const centerCount = board.reduce((acc, row) => acc + (row[centerCol] === bot ? 1 : 0), 0);
        totalScore += centerCount * 6;

        // Score Horizontal windows
        for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
            for (let c = 0; c <= CONNECT_FOUR_COLS - 4; c++) {
                const win = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
                totalScore += this.evaluateWindow(win, bot, human);
            }
        }

        // Score Vertical windows
        for (let r = 0; r <= CONNECT_FOUR_ROWS - 4; r++) {
            for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
                const win = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
                totalScore += this.evaluateWindow(win, bot, human);
            }
        }

        // Score Diagonals
        for (let r = 0; r <= CONNECT_FOUR_ROWS - 4; r++) {
            for (let c = 0; c <= CONNECT_FOUR_COLS - 4; c++) {
                const win = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
                totalScore += this.evaluateWindow(win, bot, human);
            }
        }
        for (let r = 3; r < CONNECT_FOUR_ROWS; r++) {
            for (let c = 0; c <= CONNECT_FOUR_COLS - 4; c++) {
                const win = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
                totalScore += this.evaluateWindow(win, bot, human);
            }
        }

        return totalScore;
    }

    /**
     * Alpha-Beta Pruning Minimax search for intelligent CPU play (depth 4).
     */
    public static minimax(
        board: ConnectFourCell[][],
        depth: number,
        alpha: number,
        beta: number,
        isMaximizing: boolean,
        bot: 'R' | 'Y'
    ): { score: number; bestCol?: number } {
        const human = bot === 'R' ? 'Y' : 'R';
        const validCols = this.getValidColumns(board);
        const { winner } = this.checkWinner(board);

        if (winner === bot) return { score: 100000 - (4 - depth) };
        if (winner === human) return { score: -100000 + (4 - depth) };
        if (winner === 'draw' || validCols.length === 0) return { score: 0 };
        if (depth === 0) return { score: this.scoreBoard(board, bot) };

        // Prefer searching center columns first
        const orderedCols = [...validCols].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

        if (isMaximizing) {
            let maxScore = -Infinity;
            let bestCol = orderedCols[0];

            for (const col of orderedCols) {
                const { newBoard } = this.dropDisc(board, col, bot);
                const result = this.minimax(newBoard, depth - 1, alpha, beta, false, bot);

                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestCol = col;
                }
                alpha = Math.max(alpha, maxScore);
                if (alpha >= beta) break; // Beta cutoff
            }
            return { score: maxScore, bestCol };
        } else {
            let minScore = Infinity;
            let bestCol = orderedCols[0];

            for (const col of orderedCols) {
                const { newBoard } = this.dropDisc(board, col, human);
                const result = this.minimax(newBoard, depth - 1, alpha, beta, true, bot);

                if (result.score < minScore) {
                    minScore = result.score;
                    bestCol = col;
                }
                beta = Math.min(beta, minScore);
                if (alpha >= beta) break; // Alpha cutoff
            }
            return { score: minScore, bestCol };
        }
    }

    public static selectBotMove(board: ConnectFourCell[][], bot: 'R' | 'Y' = 'Y', depth = 4): number {
        // Immediate win / block check
        const human = bot === 'R' ? 'Y' : 'R';
        const valid = this.getValidColumns(board);

        // 1. Can win this turn?
        for (const col of valid) {
            const { newBoard } = this.dropDisc(board, col, bot);
            if (this.checkWinner(newBoard).winner === bot) return col;
        }

        // 2. Can opponent win next turn? Block it!
        for (const col of valid) {
            const { newBoard } = this.dropDisc(board, col, human);
            if (this.checkWinner(newBoard).winner === human) return col;
        }

        return this.minimax(board, depth, -Infinity, Infinity, true, bot).bestCol ?? valid[0];
    }
}
