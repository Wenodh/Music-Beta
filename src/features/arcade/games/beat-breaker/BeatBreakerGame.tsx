import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { BeatBreakerEngine, Paddle, Ball, Brick, CANVAS_W, CANVAS_H } from './beatBreakerEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface BeatBreakerProps {
    theme: GameTheme;
    onBack: () => void;
}

export const BeatBreakerGame: React.FC<BeatBreakerProps> = ({ theme, onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [highScore, setHighScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const paddleRef = useRef<Paddle>(BeatBreakerEngine.createPaddle());
    const ballRef = useRef<Ball>(BeatBreakerEngine.createBall());
    const bricksRef = useRef<Brick[]>(BeatBreakerEngine.createBricks(1));
    const animFrameRef = useRef<number | null>(null);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack, initialState: 'playing' });

    useEffect(() => {
        getHighScore('beat-breaker', 'normal').then(setHighScore);
    }, []);

    const resetGame = useCallback((nextLevel = 1, resetScore = true) => {
        setLevel(nextLevel);
        if (resetScore) {
            setScore(0);
            setLives(3);
        }
        paddleRef.current = BeatBreakerEngine.createPaddle();
        ballRef.current = BeatBreakerEngine.createBall();
        bricksRef.current = BeatBreakerEngine.createBricks(nextLevel);
        setGameState('playing');
    }, [setGameState]);

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (gameState !== 'playing') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const clientX = e.clientX - rect.left;
        const targetX = clientX * scaleX - paddleRef.current.w / 2;

        paddleRef.current.x = Math.max(0, Math.min(CANVAS_W - paddleRef.current.w, targetX));
    };

    useEffect(() => {
        if (gameState !== 'playing') {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const loop = () => {
            const { ball, bricks, hitBrick, lostLife, levelCleared } = BeatBreakerEngine.updatePhysics(
                ballRef.current,
                paddleRef.current,
                bricksRef.current
            );

            ballRef.current = ball;
            bricksRef.current = bricks;

            if (hitBrick) {
                arcadeAudio.playCollect();
                setScore((s) => s + hitBrick.points);
            }

            if (lostLife) {
                arcadeAudio.playCollision();
                setLives((l) => {
                    const next = l - 1;
                    if (next <= 0) {
                        setGameState('completed');
                        ArcadeLeaderboardService.submitScore({
                            gameId: 'beat-breaker',
                            metricType: 'points',
                            score,
                            displayValue: `${score.toLocaleString()} pts`,
                            difficulty: 'normal',
                        });
                        getHighScore('beat-breaker', 'normal').then(setHighScore);
                    } else {
                        ballRef.current = BeatBreakerEngine.createBall();
                        paddleRef.current = BeatBreakerEngine.createPaddle();
                    }
                    return next;
                });
            }

            if (levelCleared) {
                arcadeAudio.playMilestone();
                resetGame(level + 1, false);
            }

            // Draw scene
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

            // Draw Bricks
            for (const b of bricks) {
                ctx.fillStyle = b.color;
                ctx.shadowColor = b.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.roundRect(b.x, b.y, b.w, b.h, 4);
                ctx.fill();
            }

            // Draw Paddle
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#06b6d4';
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.roundRect(paddleRef.current.x, paddleRef.current.y, paddleRef.current.w, paddleRef.current.h, 6);
            ctx.fill();

            // Draw Ball
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [gameState, level, score, resetGame, setGameState]);

    return (
        <ArcadeGameShell
            title="Beat Breaker"
            modeBadge={`LVL ${level}`}
            scoreDisplay={`Score: ${score.toLocaleString()}`}
            highScoreDisplay={highScore > 0 ? `Best: ${highScore.toLocaleString()}` : undefined}
            isMuted={isMuted}
            onToggleMute={() => {
                const next = !isMuted;
                setIsMuted(next);
                arcadeAudio.setEnabled(!next);
            }}
            onPause={pauseGame}
            showExitModal={showExitConfirm}
            onResume={resumeGame}
            onRestart={() => resetGame(1, true)}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-3 p-1">
                {/* HUD */}
                <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-gray-300">
                    <div className="flex items-center gap-1">
                        <span>Lives:</span>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-sm ${i < lives ? 'text-red-500' : 'text-gray-600'}`}>
                                ❤️
                            </span>
                        ))}
                    </div>
                    <span className="text-cyan-400">Drag to control paddle</span>
                </div>

                {/* Canvas Game View */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden bg-black/80 shadow-2xl w-full aspect-[400/550]">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        onPointerMove={handlePointerMove}
                        onPointerDown={handlePointerMove}
                        className="w-full h-full touch-none cursor-pointer"
                    />

                    {/* Game Over Modal */}
                    {gameState === 'completed' && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                            <div className="w-16 h-16 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mb-3 animate-bounce">
                                <IoTrophy size={36} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                                Stage Finished!
                            </h3>
                            <p className="text-xs text-gray-300 mb-4">
                                Final Score: {score.toLocaleString()} pts (Level {level})
                            </p>
                            <button
                                onClick={() => resetGame(1, true)}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Play Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ArcadeGameShell>
    );
};
