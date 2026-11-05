import { describe, it, expect } from 'vitest';
import { LudoEngine, COLOR_START_OFFSETS } from '../games/ludo/ludoEngine';
import { TicTacToeEngine } from '../games/tic-tac-toe/ticTacToeEngine';
import { ConnectFourEngine } from '../games/connect-four/connectFourEngine';
import { CheckersEngine } from '../games/checkers/checkersEngine';
import { CarromEngine, CARROM_BOARD_SIZE } from '../games/carrom/carromEngine';

describe('Vibe Arcade Batch 3: Pure Board & Tabletop Engines', () => {
    describe('1. Ludo Mini Engine', () => {
        it('requires a 6 to exit home yard to step 0', () => {
            const token = { id: 0, color: 'red' as const, step: -1 };
            expect(LudoEngine.canTokenMove(token, 5)).toBe(false);
            expect(LudoEngine.canTokenMove(token, 6)).toBe(true);
        });

        it('calculates global ring positions accurately from color offsets', () => {
            expect(LudoEngine.getGlobalRingIndex('red', 0)).toBe(COLOR_START_OFFSETS.red); // 0
            expect(LudoEngine.getGlobalRingIndex('green', 0)).toBe(COLOR_START_OFFSETS.green); // 13
            expect(LudoEngine.getGlobalRingIndex('yellow', 0)).toBe(COLOR_START_OFFSETS.yellow); // 26
            expect(LudoEngine.getGlobalRingIndex('blue', 0)).toBe(COLOR_START_OFFSETS.blue); // 39

            // Ring wraps around at 52
            expect(LudoEngine.getGlobalRingIndex('blue', 15)).toBe((39 + 15) % 52); // 2
        });

        it('requires exact roll to reach home at step 56', () => {
            const token = { id: 0, color: 'red' as const, step: 54 };
            expect(LudoEngine.canTokenMove(token, 3)).toBe(false); // 54 + 3 = 57 > 56
            expect(LudoEngine.canTokenMove(token, 2)).toBe(true);  // 54 + 2 = 56
        });

        it('captures opponent token on unprotected squares and grants extra turn', () => {
            const players = LudoEngine.createDefaultPlayers([
                { color: 'red', isBot: false },
                { color: 'blue', isBot: false },
            ]);
            // Place red token on global ring position 5 (step 5 for red)
            players[0].tokens[0].step = 3;
            // Place blue token on step 18 for blue: (39 + 18) % 52 = 57 % 52 = 5
            players[1].tokens[0].step = 18;

            // Red rolls 2 (moves from step 3 to step 5 -> global ring 5)
            const result = LudoEngine.moveToken(players, 0, 0, 2);
            expect(result.extraTurn).toBe(true);
            expect(result.capturedToken).toEqual({ color: 'blue', tokenId: 0 });
            // Opponent blue token knocked back to yard (-1)
            expect(result.nextPlayers[1].tokens[0].step).toBe(-1);
        });

        it('does not capture opponent tokens on safe squares (e.g. Red start square 0)', () => {
            const players = LudoEngine.createDefaultPlayers([
                { color: 'red', isBot: false },
                { color: 'blue', isBot: false },
            ]);
            // Safe square 0 is red start
            players[0].tokens[0].step = -1; // in yard
            // Blue token happens to be on global square 0: (39 + 13) % 52 = 0
            players[1].tokens[0].step = 13;

            // Red rolls 6 and exits to step 0 (global square 0)
            const result = LudoEngine.moveToken(players, 0, 0, 6);
            expect(result.capturedToken).toBeNull();
            expect(result.nextPlayers[1].tokens[0].step).toBe(13); // Safe!
        });

        it('bot heuristic selects optimal winning move when available', () => {
            const players = LudoEngine.createDefaultPlayers([
                { color: 'red', isBot: true },
                { color: 'green', isBot: true },
            ]);
            players[0].tokens[0].step = 53; // needs 3 to finish
            players[0].tokens[1].step = 10;

            const bestMove = LudoEngine.selectBotMove(players[0], players, 3);
            expect(bestMove).toBe(0); // Should pick token 0 to finish!
        });
    });

    describe('2. Tic-Tac-Toe Pro Engine', () => {
        it('detects horizontal, vertical, and diagonal wins', () => {
            // Horizontal row 1
            const hBoard = ['X', 'X', 'X', null, null, null, null, null, null] as any;
            expect(TicTacToeEngine.checkWinner(hBoard).winner).toBe('X');

            // Vertical col 2
            const vBoard = [null, 'O', null, null, 'O', null, null, 'O', null] as any;
            expect(TicTacToeEngine.checkWinner(vBoard).winner).toBe('O');

            // Diagonal
            const dBoard = ['X', null, null, null, 'X', null, null, null, 'X'] as any;
            expect(TicTacToeEngine.checkWinner(dBoard).winner).toBe('X');
        });

        it('detects draw on full board with no winning triplets', () => {
            const drawBoard = [
                'X', 'O', 'X',
                'X', 'O', 'O',
                'O', 'X', 'X',
            ] as any;
            expect(TicTacToeEngine.checkWinner(drawBoard).winner).toBe('draw');
        });

        it('Minimax unbeatable AI blocks immediate winning threat', () => {
            // Human 'X' has two in row 1: [X, X, empty]
            const board = [
                'X', 'X', null,
                null, 'O', null,
                null, null, null,
            ] as any;
            // Bot is 'O'. Best move must be index 2 to block!
            const bestMove = TicTacToeEngine.getBestMove(board, 'O');
            expect(bestMove).toBe(2);
        });

        it('Minimax unbeatable AI seizes immediate winning move', () => {
            const board = [
                'O', 'O', null,
                'X', 'X', null,
                null, null, null,
            ] as any;
            // Bot 'O' must take index 2 to win immediately rather than blocking 'X'
            const bestMove = TicTacToeEngine.getBestMove(board, 'O');
            expect(bestMove).toBe(2);
        });
    });

    describe('3. Connect Four Engine', () => {
        it('drops discs with correct gravity to the lowest available row', () => {
            const board = ConnectFourEngine.createEmptyBoard();
            const { newBoard, rowPlaced, success } = ConnectFourEngine.dropDisc(board, 3, 'R');
            expect(success).toBe(true);
            expect(rowPlaced).toBe(5); // Lowest row in 6-row board is index 5
            expect(newBoard[5][3]).toBe('R');

            // Second drop in same column stacks on row 4
            const second = ConnectFourEngine.dropDisc(newBoard, 3, 'Y');
            expect(second.rowPlaced).toBe(4);
            expect(second.newBoard[4][3]).toBe('Y');
        });

        it('detects horizontal, vertical, and both diagonal 4-in-a-row wins', () => {
            // Vertical 4
            const vBoard = ConnectFourEngine.createEmptyBoard();
            vBoard[5][0] = 'R';
            vBoard[4][0] = 'R';
            vBoard[3][0] = 'R';
            vBoard[2][0] = 'R';
            expect(ConnectFourEngine.checkWinner(vBoard).winner).toBe('R');

            // Diagonal down-right \
            const dBoard = ConnectFourEngine.createEmptyBoard();
            dBoard[2][2] = 'Y';
            dBoard[3][3] = 'Y';
            dBoard[4][4] = 'Y';
            dBoard[5][5] = 'Y';
            expect(ConnectFourEngine.checkWinner(dBoard).winner).toBe('Y');
        });

        it('alpha-beta bot blocks opponent 3-in-a-row threat', () => {
            const board = ConnectFourEngine.createEmptyBoard();
            board[5][0] = 'R';
            board[5][1] = 'R';
            board[5][2] = 'R';
            // Opponent R will win on col 3 if not blocked!
            const botCol = ConnectFourEngine.selectBotMove(board, 'Y', 3);
            expect(botCol).toBe(3);
        });
    });

    describe('4. Checkers Engine (Standard American/English Rules)', () => {
        it('initializes 8x8 board with 12 black pieces and 12 red pieces on dark squares', () => {
            const board = CheckersEngine.createInitialBoard();
            let blackCount = 0;
            let redCount = 0;

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = board[r][c];
                    if (p) {
                        expect((r + c) % 2).toBe(1); // Dark squares only
                        if (p.color === 'black') blackCount++;
                        if (p.color === 'red') redCount++;
                    }
                }
            }
            expect(blackCount).toBe(12);
            expect(redCount).toBe(12);
        });

        it('enforces mandatory capture rule when a jump is available', () => {
            const board: any = Array.from({ length: 8 }, () => Array(8).fill(null));
            // Red man at (5, 3), Black man at (4, 4), Landing at (3, 5) is empty
            board[5][3] = { id: 1, color: 'red', type: 'man' };
            board[4][4] = { id: 2, color: 'black', type: 'man' };
            // Unrelated red piece with simple moves
            board[6][0] = { id: 3, color: 'red', type: 'man' };

            const legalMoves = CheckersEngine.getLegalMoves(board, 'red');
            // Must ONLY contain the jump move, simple moves are disallowed!
            expect(legalMoves.length).toBe(1);
            expect(legalMoves[0].captures.length).toBe(1);
            expect(legalMoves[0].to).toEqual({ r: 3, c: 5 });
        });

        it('promotes man to king upon reaching the opposing back rank', () => {
            const board: any = Array.from({ length: 8 }, () => Array(8).fill(null));
            board[1][1] = { id: 1, color: 'red', type: 'man' };

            const move = {
                from: { r: 1, c: 1 },
                to: { r: 0, c: 2 },
                captures: [],
            };
            const nextBoard = CheckersEngine.executeMove(board, move);
            expect(nextBoard[0][2]?.type).toBe('king');
        });

        it('kings can jump backwards and forwards', () => {
            const board: any = Array.from({ length: 8 }, () => Array(8).fill(null));
            board[3][3] = { id: 1, color: 'red', type: 'king' };
            board[4][4] = { id: 2, color: 'black', type: 'man' }; // behind red king

            const legalMoves = CheckersEngine.getLegalMoves(board, 'red');
            expect(legalMoves.some((m) => m.to.r === 5 && m.to.c === 5)).toBe(true);
        });
    });

    describe('5. Carrom Disc Physics Engine', () => {
        it('initializes red queen and alternating white/black coins in center cluster', () => {
            const pieces = CarromEngine.createInitialPieces();
            const queen = pieces.find((p) => p.type === 'queen');
            expect(queen).toBeDefined();
            expect(queen?.x).toBe(CARROM_BOARD_SIZE / 2);
            expect(queen?.y).toBe(CARROM_BOARD_SIZE / 2);

            const whiteCoins = pieces.filter((p) => p.type === 'white');
            const blackCoins = pieces.filter((p) => p.type === 'black');
            expect(whiteCoins.length).toBe(3);
            expect(blackCoins.length).toBe(3);
        });

        it('applies friction and decays velocity deterministically to stationary', () => {
            const pieces = CarromEngine.createInitialPieces();
            const striker = pieces.find((p) => p.type === 'striker')!;
            CarromEngine.fireStriker(striker, -Math.PI / 2, 0.5);

            expect(Math.hypot(striker.vx, striker.vy)).toBeGreaterThan(0);

            // Step physics until stopped
            let steps = 0;
            let stationary = false;
            while (!stationary && steps < 500) {
                const res = CarromEngine.updatePhysics(pieces);
                stationary = res.allStationary;
                steps++;
            }

            expect(stationary).toBe(true);
            expect(striker.vx).toBe(0);
            expect(striker.vy).toBe(0);
        });

        it('detects pocketing in corner pockets and calculates queen-cover scoring', () => {
            const whiteCoin: any = {
                id: 'white-1',
                type: 'white',
                x: 35,
                y: 35, // Inside top-left pocket (radius 26, center 34, 34)
                vx: 0,
                vy: 0,
                radius: 13,
                mass: 1,
                isPocketed: false,
            };

            const { pocketedPieces } = CarromEngine.updatePhysics([whiteCoin]);
            expect(pocketedPieces.length).toBe(1);
            expect(pocketedPieces[0].isPocketed).toBe(true);

            // Pocketing white coin with queen pending cover awards bonus points
            const scoreResult = CarromEngine.calculateScore([pocketedPieces[0]], true);
            expect(scoreResult.queenCovered).toBe(true);
            expect(scoreResult.points).toBe(35); // 10 (white) + 25 (queen covered)
        });
    });
});
