export type TicTacToeCell = 'X' | 'O' | null;

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
     * Finds the optimal move for the AI.
     */
    public static getBestMove(board: TicTacToeCell[], aiPlayer: 'X' | 'O' = 'O'): number {
        // Fast opening shortcut: If empty, pick center or corner
        const available = this.getAvailableMoves(board);
        if (available.length === 9) return 4; // center
        if (available.length === 8 && board[4] === null) return 4;

        return this.minimax(board, 0, true, aiPlayer).bestMove ?? available[0];
    }
}
