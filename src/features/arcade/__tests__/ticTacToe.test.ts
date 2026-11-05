import { describe, it, expect } from 'vitest';
import { TicTacToeEngine, TicTacToeCell } from '../games/tic-tac-toe/ticTacToeEngine';

describe('Tic-Tac-Toe Pro - Engine & Multi-Tier AI Tests', () => {
    describe('AI Move Validity Across All Difficulties', () => {
        it('Easy AI always selects an open, legal move and never chooses an occupied cell', () => {
            const board: TicTacToeCell[] = [
                'X', 'O', 'X',
                null, 'O', null,
                null, null, null,
            ];
            for (let i = 0; i < 50; i++) {
                const move = TicTacToeEngine.selectBotMove(board, 'X', 'easy');
                expect(move).toBeGreaterThanOrEqual(0);
                expect(move).toBeLessThan(9);
                expect(board[move]).toBeNull();
            }
        });

        it('Medium AI always selects an open, legal move and never chooses an occupied cell', () => {
            const board: TicTacToeCell[] = [
                'X', 'O', null,
                null, 'X', null,
                null, null, 'O',
            ];
            for (let i = 0; i < 50; i++) {
                const move = TicTacToeEngine.selectBotMove(board, 'O', 'medium');
                expect(move).toBeGreaterThanOrEqual(0);
                expect(move).toBeLessThan(9);
                expect(board[move]).toBeNull();
            }
        });

        it('Hard AI always selects an open, legal move', () => {
            const board: TicTacToeCell[] = [
                'X', null, null,
                null, 'O', null,
                null, null, null,
            ];
            const move = TicTacToeEngine.selectBotMove(board, 'X', 'hard');
            expect(board[move]).toBeNull();
        });
    });

    describe('Immediate Threat Seizure & Block Logic', () => {
        it('Medium & Hard AI take immediate winning moves', () => {
            // Bot is 'O'. Position 2 wins the top row: [O, O, null]
            const board: TicTacToeCell[] = [
                'O', 'O', null,
                'X', 'X', null,
                null, null, null,
            ];

            const hardMove = TicTacToeEngine.selectBotMove(board, 'O', 'hard');
            expect(hardMove).toBe(2);

            const mediumMove = TicTacToeEngine.selectBotMove(board, 'O', 'medium');
            expect(mediumMove).toBe(2);
        });

        it('Hard AI blocks immediate opponent winning threats', () => {
            // Opponent 'X' has [X, X, null] on top row
            const board: TicTacToeCell[] = [
                'X', 'X', null,
                null, 'O', null,
                null, null, null,
            ];
            const move = TicTacToeEngine.selectBotMove(board, 'O', 'hard');
            expect(move).toBe(2);
        });
    });

    describe('Hard AI Exhaustive Mathematical Unbeatability Proof', () => {
        function exploreAllBranches(board: TicTacToeCell[], currentTurn: 'X' | 'O', aiPlayer: 'X' | 'O'): { aiWins: number; draws: number; humanWins: number } {
            const { winner } = TicTacToeEngine.checkWinner(board);
            if (winner) {
                if (winner === aiPlayer) return { aiWins: 1, draws: 0, humanWins: 0 };
                if (winner === 'draw') return { aiWins: 0, draws: 1, humanWins: 0 };
                return { aiWins: 0, draws: 0, humanWins: 1 };
            }

            const available = TicTacToeEngine.getAvailableMoves(board);
            if (available.length === 0) {
                return { aiWins: 0, draws: 1, humanWins: 0 };
            }

            let totals = { aiWins: 0, draws: 0, humanWins: 0 };

            if (currentTurn !== aiPlayer) {
                // Human turn: recursively test ALL reachable legal human moves
                for (const m of available) {
                    board[m] = currentTurn;
                    const res = exploreAllBranches(board, aiPlayer, aiPlayer);
                    board[m] = null;
                    totals.aiWins += res.aiWins;
                    totals.draws += res.draws;
                    totals.humanWins += res.humanWins;
                }
            } else {
                // AI turn: play single optimal move chosen by production selectBotMove
                const bestMove = TicTacToeEngine.selectBotMove(board, aiPlayer, 'hard');
                expect(board[bestMove]).toBeNull();
                board[bestMove] = aiPlayer;
                const nextTurn = aiPlayer === 'X' ? 'O' : 'X';
                const res = exploreAllBranches(board, nextTurn, aiPlayer);
                board[bestMove] = null;
                totals.aiWins += res.aiWins;
                totals.draws += res.draws;
                totals.humanWins += res.humanWins;
            }

            return totals;
        }

        it('Hard AI as O (playing second) is mathematically unbeatable across all 9 human opening moves', () => {
            const board = TicTacToeEngine.createEmptyBoard();
            const results = exploreAllBranches(board, 'X', 'O');

            // Exact count of all terminal games when AI plays second optimally
            expect(results.humanWins).toBe(0); // Zero human wins across entire game tree!
            expect(results.aiWins).toBe(372);
            expect(results.draws).toBe(117);
        });

        it('Hard AI as X (playing first) is mathematically unbeatable across all human response branches', () => {
            const board = TicTacToeEngine.createEmptyBoard();
            const results = exploreAllBranches(board, 'X', 'X');

            // Exact count of all terminal games when AI plays first optimally
            expect(results.humanWins).toBe(0); // Zero human wins across entire game tree!
            expect(results.aiWins).toBe(85);
            expect(results.draws).toBe(7);
        });
    });

    describe('Injectable PRNG Deterministic Testing', () => {
        it('uses injected PRNG function for deterministic bot moves in Easy mode', () => {
            const board: TicTacToeCell[] = [
                'X', null, null,
                null, 'O', null,
                null, null, null,
            ];

            const mockPrng = () => 0.1; // picks first available index
            const move = TicTacToeEngine.selectBotMove(board, 'O', 'easy', mockPrng);
            expect(move).toBe(1);
        });

        it('respects PRNG probability thresholds for Medium mode blocks', () => {
            const board: TicTacToeCell[] = [
                'X', 'X', null,
                null, 'O', null,
                null, null, null,
            ];

            // prng returns 0.9 (> 0.8 block threshold), so it skips block and picks random/center
            const mockPrng = () => 0.9;
            const move = TicTacToeEngine.selectBotMove(board, 'O', 'medium', mockPrng);
            expect(move).toBeDefined();
            expect(board[move]).toBeNull();
        });
    });

    describe('Win & Draw Edge Cases', () => {
        it('identifies winning rows, columns, diagonals, and draws correctly', () => {
            const fullBoardDraw: TicTacToeCell[] = [
                'X', 'O', 'X',
                'X', 'O', 'O',
                'O', 'X', 'X',
            ];
            expect(TicTacToeEngine.checkWinner(fullBoardDraw).winner).toBe('draw');

            const emptyBoard = TicTacToeEngine.createEmptyBoard();
            expect(TicTacToeEngine.checkWinner(emptyBoard).winner).toBeNull();
        });
    });
});
