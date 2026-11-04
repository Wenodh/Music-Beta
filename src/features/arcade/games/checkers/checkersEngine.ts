export type CheckersPieceType = 'man' | 'king';
export type CheckersPieceColor = 'red' | 'black';

export interface CheckersPiece {
    id: number;
    color: CheckersPieceColor;
    type: CheckersPieceType;
}

export interface CheckersMove {
    from: { r: number; c: number };
    to: { r: number; c: number };
    captures: { r: number; c: number }[]; // Coordinates of jumped pieces
    isPromotion?: boolean;
}

export class CheckersEngine {
    public static createInitialBoard(): (CheckersPiece | null)[][] {
        const board: (CheckersPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
        let idCounter = 1;

        // Black pieces occupy rows 0, 1, 2 (dark squares where (r + c) % 2 === 1)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    board[r][c] = { id: idCounter++, color: 'black', type: 'man' };
                }
            }
        }

        // Red pieces occupy rows 5, 6, 7 (dark squares)
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    board[r][c] = { id: idCounter++, color: 'red', type: 'man' };
                }
            }
        }

        return board;
    }

    /**
     * Finds all single-step non-capturing diagonal moves for a piece at (r, c).
     */
    public static getSimpleMoves(
        board: (CheckersPiece | null)[][],
        r: number,
        c: number
    ): CheckersMove[] {
        const piece = board[r][c];
        if (!piece) return [];

        const moves: CheckersMove[] = [];
        const directions: number[] = [];

        if (piece.type === 'king') {
            directions.push(-1, 1);
        } else if (piece.color === 'red') {
            directions.push(-1); // Red moves upwards towards row 0
        } else {
            directions.push(1); // Black moves downwards towards row 7
        }

        for (const dr of directions) {
            for (const dc of [-1, 1]) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === null) {
                    moves.push({
                        from: { r, c },
                        to: { r: nr, c: nc },
                        captures: [],
                    });
                }
            }
        }

        return moves;
    }

    /**
     * Recursively searches for all jump/capture sequences starting from (r, c).
     */
    public static getJumpSequences(
        board: (CheckersPiece | null)[][],
        r: number,
        c: number,
        piece: CheckersPiece,
        capturedSoFar: { r: number; c: number }[] = []
    ): CheckersMove[] {
        const sequences: CheckersMove[] = [];
        const directions: number[] = [];

        if (piece.type === 'king') {
            directions.push(-1, 1);
        } else if (piece.color === 'red') {
            directions.push(-1);
        } else {
            directions.push(1);
        }

        for (const dr of directions) {
            for (const dc of [-1, 1]) {
                const midR = r + dr;
                const midC = c + dc;
                const landR = r + 2 * dr;
                const landC = c + 2 * dc;

                if (landR >= 0 && landR < 8 && landC >= 0 && landC < 8) {
                    const midPiece = board[midR][midC];
                    // Opponent piece on intermediate square and not already captured in current chain
                    const alreadyCaptured = capturedSoFar.some((pos) => pos.r === midR && pos.c === midC);

                    if (midPiece && midPiece.color !== piece.color && !alreadyCaptured) {
                        // Landing square must be empty
                        if (board[landR][landC] === null || (landR === r && landC === c)) {
                            const newCaptured = [...capturedSoFar, { r: midR, c: midC }];

                            // Check if this jump promotes the man to king
                            const willPromote =
                                piece.type === 'man' &&
                                ((piece.color === 'red' && landR === 0) ||
                                 (piece.color === 'black' && landR === 7));

                            // In standard American/English checkers, if a man reaches the kings row, the turn ends immediately
                            if (willPromote) {
                                sequences.push({
                                    from: { r, c },
                                    to: { r: landR, c: landC },
                                    captures: newCaptured,
                                    isPromotion: true,
                                });
                                continue;
                            }

                            // Temporarily simulate the move on a board copy to check multi-jumps
                            const simBoard = board.map((row) => [...row]);
                            simBoard[r][c] = null;
                            simBoard[landR][landC] = piece;

                            const furtherJumps = this.getJumpSequences(
                                simBoard,
                                landR,
                                landC,
                                piece,
                                newCaptured
                            );

                            if (furtherJumps.length > 0) {
                                for (const nextSeq of furtherJumps) {
                                    sequences.push({
                                        from: { r, c },
                                        to: nextSeq.to,
                                        captures: nextSeq.captures,
                                    });
                                }
                            } else {
                                sequences.push({
                                    from: { r, c },
                                    to: { r: landR, c: landC },
                                    captures: newCaptured,
                                });
                            }
                        }
                    }
                }
            }
        }

        return sequences;
    }

    /**
     * Gets all legal moves for a player. Enforces mandatory captures rule:
     * If any captures exist, only capture moves are legal.
     */
    public static getLegalMoves(
        board: (CheckersPiece | null)[][],
        turnColor: CheckersPieceColor
    ): CheckersMove[] {
        const captureMoves: CheckersMove[] = [];
        const simpleMoves: CheckersMove[] = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === turnColor) {
                    const jumps = this.getJumpSequences(board, r, c, piece);
                    if (jumps.length > 0) {
                        captureMoves.push(...jumps);
                    } else {
                        simpleMoves.push(...this.getSimpleMoves(board, r, c));
                    }
                }
            }
        }

        // Mandatory capture rule:
        if (captureMoves.length > 0) {
            return captureMoves;
        }

        return simpleMoves;
    }

    /**
     * Executes a move on the board, removes captured pieces, and applies king promotions.
     */
    public static executeMove(
        board: (CheckersPiece | null)[][],
        move: CheckersMove
    ): (CheckersPiece | null)[][] {
        const nextBoard = board.map((row) => [...row]);
        const piece = nextBoard[move.from.r][move.from.c];
        if (!piece) return nextBoard;

        nextBoard[move.from.r][move.from.c] = null;

        // Remove jumped pieces
        for (const cap of move.captures) {
            nextBoard[cap.r][cap.c] = null;
        }

        // King promotion check
        const isPromotion =
            piece.type === 'man' &&
            ((piece.color === 'red' && move.to.r === 0) ||
             (piece.color === 'black' && move.to.r === 7));

        nextBoard[move.to.r][move.to.c] = {
            ...piece,
            type: isPromotion ? 'king' : piece.type,
        };

        return nextBoard;
    }

    /**
     * Checks if the game is over. If the player whose turn it is has no legal moves, they lose.
     */
    public static checkWinner(
        board: (CheckersPiece | null)[][],
        turnColor: CheckersPieceColor
    ): { winner: CheckersPieceColor | null; isDraw: boolean } {
        const legalMoves = this.getLegalMoves(board, turnColor);
        if (legalMoves.length === 0) {
            // No moves left for current turn => other player wins!
            return {
                winner: turnColor === 'red' ? 'black' : 'red',
                isDraw: false,
            };
        }

        return { winner: null, isDraw: false };
    }

    /**
     * Heuristic board evaluation for Minimax AI.
     */
    public static evaluateBoard(board: (CheckersPiece | null)[][], aiColor: CheckersPieceColor): number {
        let score = 0;
        const opponentColor = aiColor === 'red' ? 'black' : 'red';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                let pieceValue = piece.type === 'king' ? 30 : 10;
                // Positional bonuses (central dominance and advancement)
                if (c >= 2 && c <= 5) pieceValue += 2;
                if (piece.color === 'red') {
                    pieceValue += (7 - r); // advancement towards promotion
                } else {
                    pieceValue += r;
                }

                if (piece.color === aiColor) {
                    score += pieceValue;
                } else if (piece.color === opponentColor) {
                    score -= pieceValue;
                }
            }
        }

        return score;
    }

    /**
     * Minimax search with alpha-beta pruning for checkers CPU (depth 3).
     */
    public static selectBotMove(
        board: (CheckersPiece | null)[][],
        botColor: CheckersPieceColor = 'black',
        depth = 3
    ): CheckersMove | null {
        const moves = this.getLegalMoves(board, botColor);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];

        let bestMove = moves[0];
        let maxEval = -Infinity;

        for (const move of moves) {
            const newBoard = this.executeMove(board, move);
            const evalScore = this.minimax(newBoard, depth - 1, -Infinity, Infinity, false, botColor);

            if (evalScore > maxEval) {
                maxEval = evalScore;
                bestMove = move;
            }
        }

        return bestMove;
    }

    private static minimax(
        board: (CheckersPiece | null)[][],
        depth: number,
        alpha: number,
        beta: number,
        isMaximizing: boolean,
        botColor: CheckersPieceColor
    ): number {
        const oppColor = botColor === 'red' ? 'black' : 'red';
        const currentTurn = isMaximizing ? botColor : oppColor;
        const legalMoves = this.getLegalMoves(board, currentTurn);

        if (legalMoves.length === 0) {
            return isMaximizing ? -10000 : 10000;
        }

        if (depth === 0) {
            return this.evaluateBoard(board, botColor);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of legalMoves) {
                const newBoard = this.executeMove(board, move);
                const evalScore = this.minimax(newBoard, depth - 1, alpha, beta, false, botColor);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of legalMoves) {
                const newBoard = this.executeMove(board, move);
                const evalScore = this.minimax(newBoard, depth - 1, alpha, beta, true, botColor);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
}
