import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';

export type ChessDifficulty = 'easy' | 'medium' | 'hard';

// Piece value mappings for basic evaluation
const PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
};

// Positional bonuses (encouraging center control, pawn advance, knight development)
const PAWN_TABLE: number[][] = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE: number[][] = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
];

export class ChessEngine {
    /**
     * Creates a new instance of chess.js
     */
    public static createGame(fen?: string): Chess {
        return fen ? new Chess(fen) : new Chess();
    }

    /**
     * Evaluates static board position score from White's perspective.
     * Positive = good for white, Negative = good for black.
     */
    public static evaluateBoard(game: Chess): number {
        if (game.isCheckmate()) {
            return game.turn() === 'w' ? -100000 : 100000;
        }
        if (game.isDraw()) {
            return 0;
        }

        let evaluation = 0;
        const board = game.board();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const baseValue = PIECE_VALUES[piece.type];
                let positionBonus = 0;

                if (piece.type === 'p') {
                    positionBonus = piece.color === 'w' ? PAWN_TABLE[r][c] : PAWN_TABLE[7 - r][c];
                } else if (piece.type === 'n') {
                    positionBonus = piece.color === 'w' ? KNIGHT_TABLE[r][c] : KNIGHT_TABLE[7 - r][c];
                }

                const totalVal = baseValue + positionBonus;
                if (piece.color === 'w') {
                    evaluation += totalVal;
                } else {
                    evaluation -= totalVal;
                }
            }
        }

        return evaluation;
    }

    /**
     * Computes the best move for the AI opponent using Minimax with Alpha-Beta pruning.
     */
    public static selectBotMove(
        game: Chess,
        difficulty: ChessDifficulty = 'medium'
    ): Move | null {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        // Easy: 70% random, 30% shallow evaluation
        if (difficulty === 'easy') {
            if (Math.random() < 0.7) {
                return legalMoves[Math.floor(Math.random() * legalMoves.length)];
            }
        }

        const depth = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
        const isMaximizing = game.turn() === 'w';

        let bestMove: Move = legalMoves[0];
        let bestVal = isMaximizing ? -Infinity : Infinity;

        // Shuffle moves slightly to avoid deterministic repetitive openings
        const shuffledMoves = [...legalMoves].sort(() => Math.random() - 0.5);

        for (const move of shuffledMoves) {
            game.move(move);
            const value = this.minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
            game.undo();

            if (isMaximizing) {
                if (value > bestVal) {
                    bestVal = value;
                    bestMove = move;
                }
            } else {
                if (value < bestVal) {
                    bestVal = value;
                    bestMove = move;
                }
            }
        }

        return bestMove;
    }

    private static minimax(
        game: Chess,
        depth: number,
        alpha: number,
        beta: number,
        isMaximizing: boolean
    ): number {
        if (depth === 0 || game.isGameOver()) {
            return this.evaluateBoard(game);
        }

        const moves = game.moves({ verbose: true });
        if (moves.length === 0) {
            return this.evaluateBoard(game);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                game.move(move);
                const evalVal = this.minimax(game, depth - 1, alpha, beta, false);
                game.undo();

                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, evalVal);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                game.move(move);
                const evalVal = this.minimax(game, depth - 1, alpha, beta, true);
                game.undo();

                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, evalVal);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    /**
     * Gets captured pieces by comparing initial counts with current board.
     */
    public static getCapturedPieces(game: Chess): { white: PieceSymbol[]; black: PieceSymbol[] } {
        const initialCounts: Record<PieceSymbol, number> = {
            p: 8,
            n: 2,
            b: 2,
            r: 2,
            q: 1,
            k: 1,
        };

        const currentWhite: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
        const currentBlack: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

        const board = game.board();
        for (const row of board) {
            for (const cell of row) {
                if (cell) {
                    if (cell.color === 'w') {
                        currentWhite[cell.type]++;
                    } else {
                        currentBlack[cell.type]++;
                    }
                }
            }
        }

        const capturedWhite: PieceSymbol[] = [];
        const capturedBlack: PieceSymbol[] = [];

        (Object.keys(initialCounts) as PieceSymbol[]).forEach((type) => {
            if (type === 'k') return;
            const missingW = Math.max(0, initialCounts[type] - currentWhite[type]);
            for (let i = 0; i < missingW; i++) capturedWhite.push(type);

            const missingB = Math.max(0, initialCounts[type] - currentBlack[type]);
            for (let i = 0; i < missingB; i++) capturedBlack.push(type);
        });

        return { white: capturedWhite, black: capturedBlack };
    }
}
