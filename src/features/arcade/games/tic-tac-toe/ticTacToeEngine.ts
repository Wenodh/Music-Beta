export type TicTacToeCell = 'X' | 'O' | null;
export type TicTacToeDifficulty = 'easy' | 'medium' | 'hard';

export interface TicTacToeState {
    board: TicTacToeCell[]; // 9 cells for 3x3 (indices 0..8)
    turn: 'X' | 'O';
    winner: 'X' | 'O' | 'draw' | null;
    winningLine: number[] | null;
}

export const WINNING_COMBINATIONS = [
    [0, 1, 2], // row 1
    [3, 4, 5], // row 2
    [6, 7, 8], // row 3
    [0, 3, 6], // col 1
    [1, 4, 7], // col 2
    [2, 5, 8], // col 3
    [0, 4, 8], // diag 1
    [2, 4, 6], // diag 2
];

export class TicTacToeEngine {
    public static createEmptyBoard(): TicTacToeCell[] {
        return Array(9).fill(null);
    }

    public static checkWinner(board: TicTacToeCell[]): {
        winner: 'X' | 'O' | 'draw' | null;
        winningLine: number[] | null;
    } {
        for (const line of WINNING_COMBINATIONS) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], winningLine: line };
            }
        }

        if (board.every((cell) => cell !== null)) {
            return { winner: 'draw', winningLine: null };
        }

        return { winner: null, winningLine: null };
    }

    public static getAvailableMoves(board: TicTacToeCell[]): number[] {
        const moves: number[] = [];
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) moves.push(i);
        }
        return moves;
    }

    /**
     * Checks if placing a symbol results in an immediate win.
     */
    public static findWinningMove(board: TicTacToeCell[], player: 'X' | 'O'): number | null {
        const available = this.getAvailableMoves(board);
        for (const move of available) {
            board[move] = player;
            const { winner } = this.checkWinner(board);
            board[move] = null;
            if (winner === player) return move;
        }
        return null;
    }

    /**
     * Minimax algorithm with depth weighting to produce an unbeatable AI.
     */
    public static minimax(
        board: TicTacToeCell[],
        depth: number,
        isMaximizing: boolean,
        aiPlayer: 'X' | 'O'
    ): { score: number; bestMove?: number } {
        const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
        const { winner } = this.checkWinner(board);

        if (winner === aiPlayer) return { score: 10 - depth };
        if (winner === humanPlayer) return { score: depth - 10 };
        if (winner === 'draw') return { score: 0 };

        const available = this.getAvailableMoves(board);

        if (isMaximizing) {
            let maxScore = -Infinity;
            let bestMove = available[0];

            for (const move of available) {
                board[move] = aiPlayer;
                const result = this.minimax(board, depth + 1, false, aiPlayer);
                board[move] = null;

                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
            }
            return { score: maxScore, bestMove };
        } else {
            let minScore = Infinity;
            let bestMove = available[0];

            for (const move of available) {
                board[move] = humanPlayer;
                const result = this.minimax(board, depth + 1, true, aiPlayer);
                board[move] = null;

                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
            }
            return { score: minScore, bestMove };
        }
    }

    /**
     * Selects an AI move based on the requested difficulty level.
     * Uses injectable prng: () => number for deterministic testing and reproducible behavior.
     */
    public static selectBotMove(
        board: TicTacToeCell[],
        aiPlayer: 'X' | 'O' = 'O',
        difficulty: TicTacToeDifficulty = 'hard',
        prng: () => number = Math.random
    ): number {
        const available = this.getAvailableMoves(board);
        if (available.length === 0) return -1;
        if (available.length === 1) return available[0];

        const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';

        // 1. Easy Mode: Primarily random legal moves, with small 20% center/corner preference
        if (difficulty === 'easy') {
            if (prng() < 0.8) {
                const randIndex = Math.floor(prng() * available.length);
                return available[randIndex];
            }
            // Occasional center move if open
            if (board[4] === null) return 4;
            const randIndex = Math.floor(prng() * available.length);
            return available[randIndex];
        }

        // 2. Medium Mode:
        // - Always take immediate winning move
        // - Block immediate opponent win 80% of the time
        // - Otherwise pick center, or random available move so it's beatable
        if (difficulty === 'medium') {
            const winMove = this.findWinningMove(board, aiPlayer);
            if (winMove !== null) return winMove;

            const blockMove = this.findWinningMove(board, humanPlayer);
            if (blockMove !== null && prng() < 0.8) {
                return blockMove;
            }

            if (board[4] === null && prng() < 0.6) return 4;

            const randIndex = Math.floor(prng() * available.length);
            return available[randIndex];
        }

        // 3. Hard Mode: Unbeatable optimal Minimax
        // Fast opening shortcut: If center is available on move 1, seize it
        if (available.length === 9) return 4;
        if (available.length === 8 && board[4] === null) return 4;

        return this.minimax(board, 0, true, aiPlayer).bestMove ?? available[0];
    }

    /**
     * Backward-compatible alias for Hard AI mode.
     */
    public static getBestMove(board: TicTacToeCell[], aiPlayer: 'X' | 'O' = 'O'): number {
        return this.selectBotMove(board, aiPlayer, 'hard');
    }
}
