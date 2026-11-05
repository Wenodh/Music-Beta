import { describe, it, expect } from 'vitest';
import { ChessEngine } from '../games/chess/chessEngine';

describe('ChessEngine with chess.js', () => {
    it('creates an initial board with 20 legal moves for White', () => {
        const game = ChessEngine.createGame();
        const moves = game.moves();
        expect(moves).toHaveLength(20); // 16 pawn moves + 4 knight moves
        expect(game.turn()).toBe('w');
        expect(game.isGameOver()).toBe(false);
    });

    it('handles moves and updates board state accurately', () => {
        const game = ChessEngine.createGame();
        const move = game.move('e4');
        expect(move).toBeDefined();
        expect(move.from).toBe('e2');
        expect(move.to).toBe('e4');
        expect(game.turn()).toBe('b');
    });

    it('detects check and checkmate correctly (Fool\'s Mate)', () => {
        const game = ChessEngine.createGame();
        game.move('f3');
        game.move('e5');
        game.move('g4');
        const mateMove = game.move('Qh4#');
        expect(mateMove).toBeDefined();
        expect(game.inCheck()).toBe(true);
        expect(game.isCheckmate()).toBe(true);
        expect(game.isGameOver()).toBe(true);

        // Evaluation should reflect White checkmated (heavy negative score)
        const evalScore = ChessEngine.evaluateBoard(game);
        expect(evalScore).toBeLessThan(-90000);
    });

    it('detects stalemate correctly', () => {
        // Known stalemate position: White Ka8, Qc7; Black Ka6 (after Qb7? no, standard FEN)
        // FEN: 7k/5Q2/6K1/8/8/8/8/8 b - - 0 1
        const game = ChessEngine.createGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
        expect(game.isStalemate()).toBe(true);
        expect(game.isGameOver()).toBe(true);
        expect(game.isDraw()).toBe(true);
        expect(ChessEngine.evaluateBoard(game)).toBe(0);
    });

    it('selects valid bot moves across all difficulty levels', () => {
        const game = ChessEngine.createGame();
        game.move('e4');

        const easyMove = ChessEngine.selectBotMove(game, 'easy');
        expect(easyMove).not.toBeNull();
        expect(game.moves({ verbose: true }).some((m) => m.san === easyMove?.san)).toBe(true);

        const mediumMove = ChessEngine.selectBotMove(game, 'medium');
        expect(mediumMove).not.toBeNull();
        expect(game.moves({ verbose: true }).some((m) => m.san === mediumMove?.san)).toBe(true);

        const hardMove = ChessEngine.selectBotMove(game, 'hard');
        expect(hardMove).not.toBeNull();
        expect(game.moves({ verbose: true }).some((m) => m.san === hardMove?.san)).toBe(true);
    });

    it('tracks captured pieces accurately', () => {
        const game = ChessEngine.createGame();
        game.move('e4');
        game.move('d5');
        game.move('exd5'); // White captures Black's d-pawn

        const captured = ChessEngine.getCapturedPieces(game);
        expect(captured.white).toEqual([]);
        expect(captured.black).toEqual(['p']);
    });
});
