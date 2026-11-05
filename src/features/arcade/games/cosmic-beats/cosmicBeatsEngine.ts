export interface Spaceship {
    x: number;
    y: number;
    w: number;
    h: number;
    speed: number;
}

export interface Alien {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    type: 1 | 2 | 3;
    points: number;
    color: string;
}

export interface Bullet {
    id: number;
    x: number;
    y: number;
    vy: number;
    fromPlayer: boolean;
}

export const COSMIC_W = 400;
export const COSMIC_H = 550;

export class CosmicBeatsEngine {
    static createSpaceship(): Spaceship {
        return {
            x: COSMIC_W / 2 - 20,
            y: COSMIC_H - 45,
            w: 40,
            h: 22,
            speed: 6,
        };
    }

    static createAlienFleet(wave = 1): Alien[] {
        const rows = Math.min(3 + wave, 6);
        const cols = 6;
        const aliens: Alien[] = [];
        const startX = 35;
        const startY = 45;
        const spacingX = 55;
        const spacingY = 35;

        let id = 1;
        for (let r = 0; r < rows; r++) {
            const type = (r % 3) + 1 as 1 | 2 | 3;
            const points = type === 1 ? 30 : type === 2 ? 20 : 10;
            const color = type === 1 ? '#f43f5e' : type === 2 ? '#a855f7' : '#06b6d4';

            for (let c = 0; c < cols; c++) {
                aliens.push({
                    id: id++,
                    x: startX + c * spacingX,
                    y: startY + r * spacingY,
                    w: 26,
                    h: 20,
                    type,
                    points,
                    color,
                });
            }
        }
        return aliens;
    }

    static updatePhysics(
        ship: Spaceship,
        aliens: Alien[],
        bullets: Bullet[],
        alienDir: 1 | -1,
        alienSpeed: number
    ): {
        updatedAliens: Alien[];
        updatedBullets: Bullet[];
        newAlienDir: 1 | -1;
        shiftDown: boolean;
        hitAlien: Alien | null;
        playerHit: boolean;
        waveCleared: boolean;
        alienReachedBottom: boolean;
    } {
        let hitAlien: Alien | null = null;
        let playerHit = false;
        let newAlienDir = alienDir;
        let shiftDown = false;

        // Check alien boundaries
        let minX = Infinity;
        let maxX = -Infinity;
        for (const a of aliens) {
            if (a.x < minX) minX = a.x;
            if (a.x + a.w > maxX) maxX = a.x + a.w;
        }

        if (alienDir === 1 && maxX >= COSMIC_W - 10) {
            newAlienDir = -1;
            shiftDown = true;
        } else if (alienDir === -1 && minX <= 10) {
            newAlienDir = 1;
            shiftDown = true;
        }

        const updatedAliens: Alien[] = [];
        let alienReachedBottom = false;

        for (const a of aliens) {
            const nextX = a.x + newAlienDir * alienSpeed;
            const nextY = shiftDown ? a.y + 16 : a.y;
            if (nextY + a.h >= ship.y) {
                alienReachedBottom = true;
            }
            updatedAliens.push({ ...a, x: nextX, y: nextY });
        }

        // Update bullets
        const nextBullets: Bullet[] = [];
        for (const b of bullets) {
            const ny = b.y + b.vy;
            if (ny < 0 || ny > COSMIC_H) continue; // Out of bounds

            if (b.fromPlayer) {
                // Check against aliens
                let hitIdx = -1;
                for (let i = 0; i < updatedAliens.length; i++) {
                    const a = updatedAliens[i];
                    if (b.x >= a.x && b.x <= a.x + a.w && ny >= a.y && ny <= a.y + a.h) {
                        hitIdx = i;
                        hitAlien = a;
                        break;
                    }
                }
                if (hitIdx !== -1) {
                    updatedAliens.splice(hitIdx, 1);
                    continue; // Bullet consumed
                }
            } else {
                // Check against player
                if (b.x >= ship.x && b.x <= ship.x + ship.w && ny >= ship.y && ny <= ship.y + ship.h) {
                    playerHit = true;
                    continue;
                }
            }
            nextBullets.push({ ...b, y: ny });
        }

        return {
            updatedAliens,
            updatedBullets: nextBullets,
            newAlienDir,
            shiftDown,
            hitAlien,
            playerHit,
            waveCleared: updatedAliens.length === 0,
            alienReachedBottom,
        };
    }
}
