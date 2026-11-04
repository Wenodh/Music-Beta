export type CarromPieceType = 'white' | 'black' | 'queen' | 'striker';

export interface CarromPiece {
    id: string;
    type: CarromPieceType;
    x: number; // board coordinate (0..BOARD_SIZE)
    y: number;
    vx: number;
    vy: number;
    radius: number;
    mass: number;
    color: string;
    isPocketed: boolean;
}

export interface Pocket {
    x: number;
    y: number;
    radius: number;
}

export const CARROM_BOARD_SIZE = 500;
export const STRIKER_RADIUS = 18;
export const COIN_RADIUS = 13;
export const POCKET_RADIUS = 26;
export const FRICTION = 0.982; // Velocity decay per step
export const RESTITUTION = 0.92; // Bounciness on collisions

export const CARROM_POCKETS: Pocket[] = [
    { x: 34, y: 34, radius: POCKET_RADIUS }, // Top-Left
    { x: CARROM_BOARD_SIZE - 34, y: 34, radius: POCKET_RADIUS }, // Top-Right
    { x: 34, y: CARROM_BOARD_SIZE - 34, radius: POCKET_RADIUS }, // Bottom-Left
    { x: CARROM_BOARD_SIZE - 34, y: CARROM_BOARD_SIZE - 34, radius: POCKET_RADIUS }, // Bottom-Right
];

export class CarromEngine {
    public static createInitialPieces(): CarromPiece[] {
        const center = CARROM_BOARD_SIZE / 2;
        const pieces: CarromPiece[] = [];

        // Center Red Queen (3 points)
        pieces.push({
            id: 'queen',
            type: 'queen',
            x: center,
            y: center,
            vx: 0,
            vy: 0,
            radius: COIN_RADIUS,
            mass: 1.0,
            color: '#ef4444',
            isPocketed: false,
        });

        // Inner circle of 6 alternating coins (white, black, white, black, white, black)
        const innerRadius = COIN_RADIUS * 2.05;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const isWhite = i % 2 === 0;
            pieces.push({
                id: `inner-${i}`,
                type: isWhite ? 'white' : 'black',
                x: center + Math.cos(angle) * innerRadius,
                y: center + Math.sin(angle) * innerRadius,
                vx: 0,
                vy: 0,
                radius: COIN_RADIUS,
                mass: 1.0,
                color: isWhite ? '#f8fafc' : '#1e293b',
                isPocketed: false,
            });
        }

        // Striker placed on baseline (default bottom baseline for player)
        pieces.push(this.createDefaultStriker());

        return pieces;
    }

    public static createDefaultStriker(baselineY: number = CARROM_BOARD_SIZE - 75): CarromPiece {
        return {
            id: 'striker',
            type: 'striker',
            x: CARROM_BOARD_SIZE / 2,
            y: baselineY,
            vx: 0,
            vy: 0,
            radius: STRIKER_RADIUS,
            mass: 2.2, // Heavier than coins
            color: '#06b6d4',
            isPocketed: false,
        };
    }

    /**
     * Applies impulse force to striker based on aim angle and power factor (0..1).
     */
    public static fireStriker(striker: CarromPiece, angleRad: number, power: number): void {
        const maxSpeed = 24;
        const clampedPower = Math.max(0.1, Math.min(1.0, power));
        striker.vx = Math.cos(angleRad) * (maxSpeed * clampedPower);
        striker.vy = Math.sin(angleRad) * (maxSpeed * clampedPower);
    }

    /**
     * Runs a discrete physics simulation step.
     * Updates positions, applies friction, resolves piece-to-piece elastic collisions,
     * board boundary reflections, and pocketing detection.
     * Returns list of newly pocketed pieces this step.
     */
    public static updatePhysics(pieces: CarromPiece[]): {
        pieces: CarromPiece[];
        pocketedPieces: CarromPiece[];
        allStationary: boolean;
    } {
        const newlyPocketed: CarromPiece[] = [];
        let anyMoving = false;

        const activePieces = pieces.filter((p) => !p.isPocketed);

        // 1. Move and apply friction
        for (const p of activePieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= FRICTION;
            p.vy *= FRICTION;

            // Threshold stop
            if (Math.hypot(p.vx, p.vy) < 0.05) {
                p.vx = 0;
                p.vy = 0;
            } else {
                anyMoving = true;
            }

            // 2. Wall bounces (cushions)
            const minBound = 22 + p.radius;
            const maxBound = CARROM_BOARD_SIZE - 22 - p.radius;

            if (p.x < minBound) {
                p.x = minBound;
                p.vx = -p.vx * RESTITUTION;
            } else if (p.x > maxBound) {
                p.x = maxBound;
                p.vx = -p.vx * RESTITUTION;
            }

            if (p.y < minBound) {
                p.y = minBound;
                p.vy = -p.vy * RESTITUTION;
            } else if (p.y > maxBound) {
                p.y = maxBound;
                p.vy = -p.vy * RESTITUTION;
            }

            // 3. Check Pocketing
            for (const pocket of CARROM_POCKETS) {
                const distToPocket = Math.hypot(p.x - pocket.x, p.y - pocket.y);
                if (distToPocket < pocket.radius) {
                    p.isPocketed = true;
                    p.vx = 0;
                    p.vy = 0;
                    newlyPocketed.push(p);
                    break;
                }
            }
        }

        // 4. Piece-to-piece elastic collisions
        const unpocketed = activePieces.filter((p) => !p.isPocketed);
        for (let i = 0; i < unpocketed.length; i++) {
            for (let j = i + 1; j < unpocketed.length; j++) {
                const p1 = unpocketed[i];
                const p2 = unpocketed[j];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = p1.radius + p2.radius;

                if (dist < minDist && dist > 0) {
                    // Normal vector
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Separate overlapping pieces
                    const overlap = 0.5 * (minDist - dist);
                    p1.x -= nx * overlap;
                    p1.y -= ny * overlap;
                    p2.x += nx * overlap;
                    p2.y += ny * overlap;

                    // Relative velocity
                    const kx = p1.vx - p2.vx;
                    const ky = p1.vy - p2.vy;
                    const p = 2 * (nx * kx + ny * ky) / (p1.mass + p2.mass);

                    p1.vx -= p * p2.mass * nx * RESTITUTION;
                    p1.vy -= p * p2.mass * ny * RESTITUTION;
                    p2.vx += p * p1.mass * nx * RESTITUTION;
                    p2.vy += p * p1.mass * ny * RESTITUTION;
                }
            }
        }

        return {
            pieces,
            pocketedPieces: newlyPocketed,
            allStationary: !anyMoving,
        };
    }

    /**
     * Resets striker to baseline if stationary or pocketed.
     */
    public static resetStriker(pieces: CarromPiece[], baselineY: number = CARROM_BOARD_SIZE - 75): CarromPiece[] {
        return pieces.map((p) => {
            if (p.type === 'striker') {
                return {
                    ...this.createDefaultStriker(baselineY),
                    x: CARROM_BOARD_SIZE / 2,
                    isPocketed: false,
                };
            }
            return p;
        });
    }

    /**
     * Evaluates round scoring and queen-cover rules:
     * - White coin: +10 pts
     * - Black coin: +5 pts
     * - Red Queen: +25 pts (must be covered by pocketing another coin in same or next turn)
     * - Striker pocketed (Foul): -10 pts penalty + striker resets
     */
    public static calculateScore(
        pocketedInTurn: CarromPiece[],
        queenPendingCover: boolean
    ): {
        points: number;
        foul: boolean;
        queenPocketed: boolean;
        queenCovered: boolean;
    } {
        let points = 0;
        let foul = false;
        let queenPocketed = false;
        let queenCovered = false;

        const hasCoin = pocketedInTurn.some((p) => p.type === 'white' || p.type === 'black');

        for (const p of pocketedInTurn) {
            if (p.type === 'striker') {
                foul = true;
                points -= 10;
            } else if (p.type === 'white') {
                points += 10;
            } else if (p.type === 'black') {
                points += 5;
            } else if (p.type === 'queen') {
                queenPocketed = true;
            }
        }

        if (queenPendingCover && hasCoin) {
            queenCovered = true;
            points += 25; // Bonus for covering the Queen
        }

        return { points, foul, queenPocketed, queenCovered };
    }
}
