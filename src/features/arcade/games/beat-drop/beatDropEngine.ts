export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Piece {
    type: TetrominoType;
    matrix: number[][];
    x: number;
    y: number;
    color: string;
}

export const DROP_COLS = 10;
export const DROP_ROWS = 20;

export const SHAPES: Record<TetrominoType, { matrix: number[][]; color: string }> = {
    I: {
        matrix: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ],
        color: '#06b6d4',
    },
    J: {
        matrix: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        color: '#3b82f6',
    },
    L: {
        matrix: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ],
        color: '#f97316',
    },
    O: {
        matrix: [
            [1, 1],
            [1, 1],
        ],
        color: '#eab308',
    },
    S: {
        matrix: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0],
        ],
        color: '#22c55e',
    },
    T: {
        matrix: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        color: '#a855f7',
    },
    Z: {
        matrix: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0],
        ],
        color: '#ef4444',
    },
};

export class BeatDropEngine {
    static createEmptyBoard(): (string | null)[][] {
        return Array.from({ length: DROP_ROWS }, () => Array(DROP_COLS).fill(null));
    }

    static spawnPiece(type?: TetrominoType): Piece {
        const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        const chosen = type || types[Math.floor(Math.random() * types.length)];
        const shape = SHAPES[chosen];
        return {
            type: chosen,
            matrix: shape.matrix.map((row) => [...row]),
            x: Math.floor((DROP_COLS - shape.matrix[0].length) / 2),
            y: 0,
            color: shape.color,
        };
    }

    static rotateMatrix(matrix: number[][]): number[][] {
        const N = matrix.length;
        const result: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                result[c][N - 1 - r] = matrix[r][c];
            }
        }
        return result;
    }

    static collides(board: (string | null)[][], piece: Piece, offsetX = 0, offsetY = 0): boolean {
        for (let r = 0; r < piece.matrix.length; r++) {
            for (let c = 0; c < piece.matrix[r].length; c++) {
                if (piece.matrix[r][c]) {
                    const nx = piece.x + c + offsetX;
                    const ny = piece.y + r + offsetY;

                    if (nx < 0 || nx >= DROP_COLS || ny >= DROP_ROWS) return true;
                    if (ny >= 0 && board[ny][nx] !== null) return true;
                }
            }
        }
        return false;
    }

    static mergePiece(board: (string | null)[][], piece: Piece): (string | null)[][] {
        const newBoard = board.map((row) => [...row]);
        for (let r = 0; r < piece.matrix.length; r++) {
            for (let c = 0; c < piece.matrix[r].length; c++) {
                if (piece.matrix[r][c]) {
                    const ny = piece.y + r;
                    const nx = piece.x + c;
                    if (ny >= 0 && ny < DROP_ROWS && nx >= 0 && nx < DROP_COLS) {
                        newBoard[ny][nx] = piece.color;
                    }
                }
            }
        }
        return newBoard;
    }

    static clearLines(board: (string | null)[][]): { newBoard: (string | null)[][]; linesCleared: number } {
        const remaining = board.filter((row) => row.some((cell) => cell === null));
        const linesCleared = DROP_ROWS - remaining.length;
        const newRows: (string | null)[][] = Array.from({ length: linesCleared }, () =>
            Array(DROP_COLS).fill(null)
        );
        return {
            newBoard: [...newRows, ...remaining],
            linesCleared,
        };
    }
}
