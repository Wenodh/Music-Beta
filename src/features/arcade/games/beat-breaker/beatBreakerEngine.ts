export interface Paddle {
    x: number;
    y: number;
    w: number;
    h: number;
    speed: number;
}

export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export interface Brick {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    points: number;
    color: string;
}

export const CANVAS_W = 400;
export const CANVAS_H = 550;

export class BeatBreakerEngine {
    static createPaddle(): Paddle {
        return {
            x: CANVAS_W / 2 - 45,
            y: CANVAS_H - 40,
            w: 90,
            h: 14,
            speed: 7,
        };
    }

    static createBall(): Ball {
        return {
            x: CANVAS_W / 2,
            y: CANVAS_H - 60,
            vx: 3.5 * (Math.random() > 0.5 ? 1 : -1),
            vy: -4.5,
            radius: 6,
        };
    }

    static createBricks(rows = 5, cols = 8): Brick[] {
        const bricks: Brick[] = [];
        const padding = 6;
        const offsetTop = 45;
        const offsetLeft = 14;
        const brickW = (CANVAS_W - offsetLeft * 2 - padding * (cols - 1)) / cols;
        const brickH = 16;

        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

        let id = 1;
        for (let r = 0; r < rows; r++) {
            const color = colors[r % colors.length];
            const points = (rows - r) * 10;
            for (let c = 0; c < cols; c++) {
                bricks.push({
                    id: id++,
                    x: offsetLeft + c * (brickW + padding),
                    y: offsetTop + r * (brickH + padding),
                    w: brickW,
                    h: brickH,
                    points,
                    color,
                });
            }
        }
        return bricks;
    }

    static updatePhysics(
        ball: Ball,
        paddle: Paddle,
        bricks: Brick[]
    ): {
        ball: Ball;
        bricks: Brick[];
        hitBrick: Brick | null;
        lostLife: boolean;
        levelCleared: boolean;
    } {
        let nx = ball.x + ball.vx;
        let ny = ball.y + ball.vy;
        let nvx = ball.vx;
        let nvy = ball.vy;
        let lostLife = false;
        let hitBrick: Brick | null = null;

        // Wall collisions
        if (nx - ball.radius <= 0) {
            nx = ball.radius;
            nvx = Math.abs(nvx);
        } else if (nx + ball.radius >= CANVAS_W) {
            nx = CANVAS_W - ball.radius;
            nvx = -Math.abs(nvx);
        }

        if (ny - ball.radius <= 0) {
            ny = ball.radius;
            nvy = Math.abs(nvy);
        } else if (ny + ball.radius >= CANVAS_H) {
            // Ball lost
            lostLife = true;
        }

        // Paddle collision
        if (
            ny + ball.radius >= paddle.y &&
            ny - ball.radius <= paddle.y + paddle.h &&
            nx >= paddle.x &&
            nx <= paddle.x + paddle.w
        ) {
            nvy = -Math.abs(nvy);
            // Angle ball depending on where it hits paddle
            const hitOffset = (nx - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
            nvx = hitOffset * 5.5;
            ny = paddle.y - ball.radius;
        }

        // Brick collisions
        const remainingBricks: Brick[] = [];
        for (const b of bricks) {
            if (!hitBrick && nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h) {
                hitBrick = b;
                nvy = -nvy;
            } else {
                remainingBricks.push(b);
            }
        }

        return {
            ball: { ...ball, x: nx, y: ny, vx: nvx, vy: nvy },
            bricks: remainingBricks,
            hitBrick,
            lostLife,
            levelCleared: remainingBricks.length === 0,
        };
    }
}
