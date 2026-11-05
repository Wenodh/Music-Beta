import { describe, it, expect } from 'vitest';
import { BeatBreakerEngine } from '../games/beat-breaker/beatBreakerEngine';
import { CosmicBeatsEngine } from '../games/cosmic-beats/cosmicBeatsEngine';
import { BeatDropEngine } from '../games/beat-drop/beatDropEngine';
import { RhythmTapEngine } from '../games/rhythm-tap/rhythmTapEngine';
import { SimonBeatsEngine } from '../games/simon-beats/simonBeatsEngine';
import { MemoryFlipEngine } from '../games/memory-flip/memoryFlipEngine';
import { VibeSolitaireEngine } from '../games/vibe-solitaire/vibeSolitaireEngine';

describe('Batch 4 Game Engines', () => {
    describe('Beat Breaker Engine', () => {
        it('initializes paddle, ball, and brick layouts', () => {
            const paddle = BeatBreakerEngine.createPaddle();
            const ball = BeatBreakerEngine.createBall();
            const bricks = BeatBreakerEngine.createBricks(5, 8);

            expect(paddle.w).toBe(90);
            expect(ball.radius).toBe(6);
            expect(bricks.length).toBe(40);
        });

        it('detects brick collision and removes brick from matrix', () => {
            const paddle = BeatBreakerEngine.createPaddle();
            const bricks = BeatBreakerEngine.createBricks(1, 1);
            const targetBrick = bricks[0];
            const ball = {
                x: targetBrick.x + targetBrick.w / 2,
                y: targetBrick.y + targetBrick.h / 2,
                vx: 0,
                vy: -4,
                radius: 4,
            };

            const result = BeatBreakerEngine.updatePhysics(ball, paddle, bricks);
            expect(result.hitBrick).toBeDefined();
            expect(result.hitBrick?.id).toBe(targetBrick.id);
            expect(result.bricks.length).toBe(0);
            expect(result.levelCleared).toBe(true);
        });
    });

    describe('Cosmic Beats Engine', () => {
        it('generates alien fleet according to wave', () => {
            const wave1Aliens = CosmicBeatsEngine.createAlienFleet(1);
            expect(wave1Aliens.length).toBe(24); // 4 rows * 6 cols
        });

        it('handles bullet collisions with aliens', () => {
            const ship = CosmicBeatsEngine.createSpaceship();
            const aliens = CosmicBeatsEngine.createAlienFleet(1);
            // target the first alien after its displacement (alienDir=1, speed=1 => nextX = alien.x + 1)
            const targetAlien = aliens[0];
            const bullet = {
                id: 1,
                x: targetAlien.x + 5,
                y: targetAlien.y + 10,
                vy: -2,
                fromPlayer: true,
            };

            const result = CosmicBeatsEngine.updatePhysics(ship, aliens, [bullet], 1, 1);
            expect(result.hitAlien).toBeDefined();
            expect(result.updatedAliens.length).toBe(aliens.length - 1);
        });
    });

    describe('Beat Drop Engine (Tetris)', () => {
        it('creates 20x10 empty matrix and spawns valid tetrominos', () => {
            const board = BeatDropEngine.createEmptyBoard();
            expect(board.length).toBe(20);
            expect(board[0].length).toBe(10);

            const piece = BeatDropEngine.spawnPiece('T');
            expect(piece.type).toBe('T');
            expect(piece.matrix.length).toBe(3);
        });

        it('clears completed horizontal lines correctly', () => {
            const board = BeatDropEngine.createEmptyBoard();
            // Fill bottom row completely
            board[19] = Array(10).fill('#06b6d4');

            const { newBoard, linesCleared } = BeatDropEngine.clearLines(board);
            expect(linesCleared).toBe(1);
            expect(newBoard.length).toBe(20);
            expect(newBoard[19].every((c) => c === null)).toBe(true);
        });
    });

    describe('Rhythm Tap Engine', () => {
        it('evaluates timing precision windows accurately', () => {
            const perfectHit = RhythmTapEngine.evaluateHit(85, 85, 15);
            expect(perfectHit?.rating).toBe('PERFECT');
            expect(perfectHit?.points).toBe(300);

            const greatHit = RhythmTapEngine.evaluateHit(79, 85, 15);
            expect(greatHit?.rating).toBe('GREAT');

            const goodHit = RhythmTapEngine.evaluateHit(73, 85, 15);
            expect(goodHit?.rating).toBe('GOOD');

            const missHit = RhythmTapEngine.evaluateHit(50, 85, 15);
            expect(missHit).toBeNull();
        });
    });

    describe('Simon Beats Engine', () => {
        it('generates sequence steps and validates user matching', () => {
            const seq1 = SimonBeatsEngine.generateNextStep([]);
            expect(seq1.length).toBe(1);

            const valid = SimonBeatsEngine.verifyInput(seq1, 0, seq1[0]);
            expect(valid).toBe(true);

            const wrongColor = seq1[0] === 'red' ? 'blue' : 'red';
            const invalid = SimonBeatsEngine.verifyInput(seq1, 0, wrongColor);
            expect(invalid).toBe(false);
        });
    });

    describe('Memory Flip Engine', () => {
        it('creates a 16-card shuffled deck with 8 pairs', () => {
            const deck = MemoryFlipEngine.createDeck();
            expect(deck.length).toBe(16);

            const card1 = deck[0];
            const matchingCard = deck.find((c) => c.id !== card1.id && c.pairId === card1.pairId);
            expect(matchingCard).toBeDefined();

            expect(MemoryFlipEngine.checkMatch(card1, matchingCard!)).toBe(true);
        });
    });

    describe('Vibe Solitaire Engine', () => {
        it('deals a standard 52-card Klondike setup', () => {
            const state = VibeSolitaireEngine.dealGame();
            expect(state.tableau.length).toBe(7);
            expect(state.tableau[0].length).toBe(1);
            expect(state.tableau[6].length).toBe(7);
            expect(state.stock.length).toBe(24);
            expect(state.foundations.length).toBe(4);
        });

        it('enforces foundation rules (Ace first, ascending same suit)', () => {
            const foundation: any[] = [];
            const aceHearts = { id: 1, suit: 'hearts' as const, value: 1, faceUp: true };
            const twoHearts = { id: 2, suit: 'hearts' as const, value: 2, faceUp: true };
            const threeSpades = { id: 3, suit: 'spades' as const, value: 3, faceUp: true };

            expect(VibeSolitaireEngine.canMoveToFoundation(aceHearts, foundation)).toBe(true);
            expect(VibeSolitaireEngine.canMoveToFoundation(twoHearts, foundation)).toBe(false);

            foundation.push(aceHearts);
            expect(VibeSolitaireEngine.canMoveToFoundation(twoHearts, foundation)).toBe(true);
            expect(VibeSolitaireEngine.canMoveToFoundation(threeSpades, foundation)).toBe(false);
        });
    });
});
