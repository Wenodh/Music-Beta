import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    CosmicBeatsEngine,
    Spaceship,
    Alien,
    Bullet,
    COSMIC_W,
    COSMIC_H,
} from './cosmicBeatsEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface CosmicBeatsProps {
    theme: GameTheme;
    onBack: () => void;
}

export const CosmicBeatsGame: React.FC<CosmicBeatsProps> = ({ theme, onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [wave, setWave] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [highScore, setHighScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const shipRef = useRef<Spaceship>(CosmicBeatsEngine.createSpaceship());
    const aliensRef = useRef<Alien[]>(CosmicBeatsEngine.createAlienFleet(1));
    const bulletsRef = useRef<Bullet[]>([]);
    const alienDirRef = useRef<1 | -1>(1);
    const animFrameRef = useRef<number | null>(null);
    const bulletIdRef = useRef(1);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack, initialState: 'playing' });

    useEffect(() => {
        getHighScore('cosmic-beats', 'normal').then(setHighScore);
    }, []);

    const resetGame = useCallback((nextWave = 1, resetScore = true) => {
        setWave(nextWave);
        if (resetScore) {
            setScore(0);
            setLives(3);
        }
        shipRef.current = CosmicBeatsEngine.createSpaceship();
        aliensRef.current = CosmicBeatsEngine.createAlienFleet(nextWave);
        bulletsRef.current = [];
        alienDirRef.current = 1;
        setGameState('playing');
    }, [setGameState]);

    const fireBullet = useCallback(() => {
        if (gameState !== 'playing') return;
        // Max 3 active player bullets
        const activePlayerBullets = bulletsRef.current.filter((b) => b.fromPlayer);
        if (activePlayerBullets.length >= 3) return;

        arcadeAudio.playJump();
        bulletsRef.current.push({
            id: bulletIdRef.current++,
            x: shipRef.current.x + shipRef.current.w / 2,
            y: shipRef.current.y - 4,
            vy: -7,
            fromPlayer: true,
        });
    }, [gameState]);

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (gameState !== 'playing') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = COSMIC_W / rect.width;
        const clientX = e.clientX - rect.left;
        const targetX = clientX * scaleX - shipRef.current.w / 2;

        shipRef.current.x = Math.max(0, Math.min(COSMIC_W - shipRef.current.w, targetX));
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                fireBullet();
            } else if (e.key === 'ArrowLeft') {
                shipRef.current.x = Math.max(0, shipRef.current.x - 20);
            } else if (e.key === 'ArrowRight') {
                shipRef.current.x = Math.min(COSMIC_W - shipRef.current.w, shipRef.current.x + 20);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fireBullet]);

    useEffect(() => {
        if (gameState !== 'playing') {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let alienFireCounter = 0;

        const loop = () => {
            alienFireCounter++;
            // Aliens randomly shoot
            if (alienFireCounter % 50 === 0 && aliensRef.current.length > 0) {
                const randomAlien = aliensRef.current[Math.floor(Math.random() * aliensRef.current.length)];
                bulletsRef.current.push({
                    id: bulletIdRef.current++,
                    x: randomAlien.x + randomAlien.w / 2,
                    y: randomAlien.y + randomAlien.h + 2,
                    vy: 4,
                    fromPlayer: false,
                });
            }

            const speed = 1.0 + wave * 0.2;
            const {
                updatedAliens,
                updatedBullets,
                newAlienDir,
                hitAlien,
                playerHit,
                waveCleared,
                alienReachedBottom,
            } = CosmicBeatsEngine.updatePhysics(
                shipRef.current,
                aliensRef.current,
                bulletsRef.current,
                alienDirRef.current,
                speed
            );

            aliensRef.current = updatedAliens;
            bulletsRef.current = updatedBullets;
            alienDirRef.current = newAlienDir;

            if (hitAlien) {
                arcadeAudio.playCollect();
                setScore((s) => s + hitAlien.points);
            }

            if (playerHit || alienReachedBottom) {
                arcadeAudio.playCollision();
                setLives((l) => {
                    const next = l - 1;
                    if (next <= 0) {
                        setGameState('completed');
                        ArcadeLeaderboardService.submitScore({
                            gameId: 'cosmic-beats',
                            metricType: 'points',
                            score,
                            displayValue: `${score.toLocaleString()} pts`,
                            difficulty: 'normal',
                        });
                        getHighScore('cosmic-beats', 'normal').then(setHighScore);
                    }
                    return next;
                });
            }

            if (waveCleared) {
                arcadeAudio.playMilestone();
                resetGame(wave + 1, false);
            }

            // Render scene
            ctx.clearRect(0, 0, COSMIC_W, COSMIC_H);

            // Draw Stars / Cosmic Backdrop
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 20; i++) {
                const sx = (i * 97) % COSMIC_W;
                const sy = (i * 131) % COSMIC_H;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }

            // Draw Aliens
            for (const a of aliensRef.current) {
                ctx.fillStyle = a.color;
                ctx.shadowColor = a.color;
                ctx.shadowBlur = 8;
                ctx.fillRect(a.x, a.y, a.w, a.h);
            }

            // Draw Player Ship
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(shipRef.current.x + shipRef.current.w / 2, shipRef.current.y);
            ctx.lineTo(shipRef.current.x + shipRef.current.w, shipRef.current.y + shipRef.current.h);
            ctx.lineTo(shipRef.current.x, shipRef.current.y + shipRef.current.h);
            ctx.closePath();
            ctx.fill();

            // Draw Bullets
            for (const b of bulletsRef.current) {
                ctx.fillStyle = b.fromPlayer ? '#38bdf8' : '#f87171';
                ctx.shadowColor = b.fromPlayer ? '#38bdf8' : '#f87171';
                ctx.shadowBlur = 6;
                ctx.fillRect(b.x - 2, b.y, 4, 10);
            }

            ctx.shadowBlur = 0;

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [gameState, wave, score, resetGame, setGameState]);

    return (
        <ArcadeGameShell
            title="Cosmic Beats"
            modeBadge={`WAVE ${wave}`}
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
                        <span>Shields:</span>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-sm ${i < lives ? 'text-emerald-400' : 'text-gray-600'}`}>
                                🛡️
                            </span>
                        ))}
                    </div>
                    <span className="text-emerald-400">Tap canvas or button to fire</span>
                </div>

                {/* Canvas Game View */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden bg-black/90 shadow-2xl w-full aspect-[400/550]">
                    <canvas
                        ref={canvasRef}
                        width={COSMIC_W}
                        height={COSMIC_H}
                        onPointerMove={handlePointerMove}
                        onPointerDown={() => {
                            fireBullet();
                        }}
                        className="w-full h-full touch-none cursor-crosshair"
                    />

                    {/* Game Over Modal */}
                    {gameState === 'completed' && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                            <div className="w-16 h-16 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                                <IoTrophy size={36} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                                Sector Overrun!
                            </h3>
                            <p className="text-xs text-gray-300 mb-4">
                                Final Score: {score.toLocaleString()} pts (Wave {wave})
                            </p>
                            <button
                                onClick={() => resetGame(1, true)}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Deploy Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Fire Button for Mobile */}
                <div className="w-full flex justify-center pt-1">
                    <button
                        onClick={fireBullet}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-sm tracking-wider rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                        ⚡ Fire Laser
                    </button>
                </div>
            </div>
        </ArcadeGameShell>
    );
};
