import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore, getHighScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute, IoPause, IoPlayOutline } from 'react-icons/io5';

interface VibeRunnerProps {
    theme: GameTheme;
    dialogueEnabled: boolean;
    dialogueLanguage: 'auto' | 'english' | 'telugu' | 'hindi';
    songLanguage?: string;
    onBack: () => void;
}

interface Obstacle {
    x: number;
    width: number;
    height: number;
}

interface Collectible {
    x: number;
    y: number;
    collected: boolean;
}

export const VibeRunner: React.FC<VibeRunnerProps> = ({
    theme: roundTheme,
    dialogueEnabled,
    dialogueLanguage,
    songLanguage,
    onBack,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
    const [speech, setSpeech] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [canRestart, setCanRestart] = useState(false);

    const CANVAS_WIDTH = 420;
    const CANVAS_HEIGHT = 280;
    const GROUND_Y = 225;

    const playerYRef = useRef(GROUND_Y - 32);
    const playerVelYRef = useRef(0);
    const isGroundedRef = useRef(true);

    const obstaclesRef = useRef<Obstacle[]>([]);
    const collectiblesRef = useRef<Collectible[]>([]);
    // Beginner friendly starting speed: 3.2 (previously 4.0)
    const speedRef = useRef(3.2);
    const scoreRef = useRef(0);
    const frameIdRef = useRef<number | null>(null);

    useEffect(() => {
        getHighScore('vibe-runner').then(setHighScore);
    }, []);

    const showDialogue = useCallback((trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score') => {
        if (!dialogueEnabled) return;
        const text = DialogueEngine.getRandomDialogue(trigger, dialogueLanguage, songLanguage);
        setSpeech(text);
        setTimeout(() => setSpeech(null), 3000);
    }, [dialogueEnabled, dialogueLanguage, songLanguage]);

    const jump = useCallback(() => {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState === 'gameover') {
            if (canRestart) startGame();
            return;
        }
        if (gameState === 'paused') {
            return;
        }
        if (isGroundedRef.current) {
            playerVelYRef.current = -9.8;
            isGroundedRef.current = false;
            arcadeAudio.playJump();
        }
    }, [gameState, canRestart]);

    const togglePause = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (gameState === 'playing') {
            setGameState('paused');
        } else if (gameState === 'paused') {
            setGameState('playing');
        }
    };

    const startGame = () => {
        playerYRef.current = GROUND_Y - 32;
        playerVelYRef.current = 0;
        isGroundedRef.current = true;
        obstaclesRef.current = [{ x: CANVAS_WIDTH + 100, width: 22, height: 32 }];
        collectiblesRef.current = [{ x: CANVAS_WIDTH + 160, y: GROUND_Y - 55, collected: false }];
        speedRef.current = 3.2;
        scoreRef.current = 0;
        setScore(0);
        setCanRestart(false);
        setGameState('playing');
        showDialogue('start');
    };

    const endGame = async () => {
        setGameState('gameover');
        if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        arcadeAudio.playCollision();

        // Tap restart guard
        setTimeout(() => setCanRestart(true), 400);

        const { isNewHighScore, highScore: newHigh } = await saveGameScore('vibe-runner', scoreRef.current);
        setHighScore(newHigh);
        if (isNewHighScore && scoreRef.current > 0) {
            showDialogue('new-high-score');
            arcadeAudio.playMilestone();
        } else {
            showDialogue('game-over');
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                jump();
            } else if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                togglePause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump]);

    // Game loop
    useEffect(() => {
        if (gameState !== 'playing') {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const loop = () => {
            // Player jump physics
            playerVelYRef.current += 0.52;
            playerYRef.current += playerVelYRef.current;

            if (playerYRef.current >= GROUND_Y - 32) {
                playerYRef.current = GROUND_Y - 32;
                playerVelYRef.current = 0;
                isGroundedRef.current = true;
            }

            // Gentle speed up capped at 5.5
            if (speedRef.current < 5.5) {
                speedRef.current += 0.0004;
            }
            const currentSpeed = speedRef.current;

            // Score increases with distance
            scoreRef.current += 1;
            setScore(Math.floor(scoreRef.current / 10));

            if (Math.floor(scoreRef.current / 10) > 0 && Math.floor(scoreRef.current / 10) % 100 === 0) {
                showDialogue('milestone');
                arcadeAudio.playMilestone();
            }

            // Move and spawn obstacles
            const obstacles = obstaclesRef.current;
            for (let i = 0; i < obstacles.length; i++) {
                obstacles[i].x -= currentSpeed;

                // Forgiving collision detection (slightly smaller player hitbox: inset 4px)
                const playerBox = {
                    left: 54,
                    right: 72,
                    top: playerYRef.current + 4,
                    bottom: playerYRef.current + 32,
                };

                const obs = obstacles[i];
                if (
                    playerBox.right > obs.x &&
                    playerBox.left < obs.x + obs.width &&
                    playerBox.bottom > GROUND_Y - obs.height
                ) {
                    endGame();
                    return;
                }
            }

            if (obstacles.length > 0 && obstacles[0].x < -50) {
                obstacles.shift();
            }

            const lastObs = obstacles[obstacles.length - 1];
            // Generous beginner spacing (minimum 180px gap)
            if (!lastObs || lastObs.x < CANVAS_WIDTH - Math.random() * 120 - 180) {
                obstacles.push({
                    x: CANVAS_WIDTH + Math.random() * 40,
                    width: 22,
                    height: Math.random() < 0.6 ? 28 : 38,
                });
            }

            // Collectibles (Vinyl records / Notes)
            const collectibles = collectiblesRef.current;
            for (let i = 0; i < collectibles.length; i++) {
                collectibles[i].x -= currentSpeed;

                if (!collectibles[i].collected) {
                    const dist = Math.hypot(collectibles[i].x - 63, collectibles[i].y - (playerYRef.current + 16));
                    if (dist < 26) {
                        collectibles[i].collected = true;
                        scoreRef.current += 50;
                        setScore(Math.floor(scoreRef.current / 10));
                        arcadeAudio.playCollect();
                    }
                }
            }

            if (collectibles.length > 0 && collectibles[0].x < -30) {
                collectibles.shift();
            }

            if (Math.random() < 0.015 && collectibles.length < 3) {
                collectibles.push({
                    x: CANVAS_WIDTH + 30,
                    y: GROUND_Y - 55 - Math.random() * 30,
                    collected: false,
                });
            }

            // Draw Background
            ctx.fillStyle = roundTheme.colors.background;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Subtle scanlines
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
                ctx.fillRect(0, y, CANVAS_WIDTH, 1);
            }

            // Draw Ground
            ctx.fillStyle = roundTheme.colors.ground;
            ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
            ctx.fillStyle = roundTheme.colors.accent;
            ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 3);

            // Draw Obstacles (Sound Amp / Speaker)
            obstacles.forEach((obs) => {
                ctx.fillStyle = roundTheme.colors.obstacle;
                ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);

                // Speaker Cone
                ctx.fillStyle = roundTheme.colors.secondaryAccent;
                ctx.beginPath();
                ctx.arc(obs.x + obs.width / 2, GROUND_Y - obs.height / 2, obs.width / 3.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Collectibles
            collectibles.forEach((c) => {
                if (!c.collected) {
                    ctx.fillStyle = roundTheme.colors.collectible;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw Runner Character
            ctx.fillStyle = roundTheme.colors.character;
            ctx.fillRect(50, playerYRef.current, 26, 32);

            // Pixel Visor
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(66, playerYRef.current + 6, 8, 6);

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [gameState, roundTheme]);

    return (
        <div
            onClick={jump}
            className="fixed inset-0 z-[400] md:relative md:inset-auto flex flex-col items-center justify-center select-none bg-black md:bg-transparent touch-none h-[100dvh] w-full max-w-full overflow-hidden p-3 sm:p-4"
        >
            {/* Top Toolbar */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                    className="pointer-events-auto p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all"
                    aria-label="Back to Arcade"
                >
                    <IoArrowBack size={20} />
                </button>

                <div className="flex flex-col items-center pointer-events-none">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {score}
                    </span>
                    {highScore > 0 && (
                        <span className="text-[10px] font-bold text-amber-400 drop-shadow">
                            Best: {highScore}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    {gameState === 'playing' && (
                        <button
                            onClick={togglePause}
                            className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all"
                            aria-label="Pause Game"
                        >
                            <IoPause size={18} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = !isMuted;
                            setIsMuted(next);
                            arcadeAudio.setEnabled(!next);
                        }}
                        className={`p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full border border-white/15 shadow-xl active:scale-95 transition-all ${
                            !isMuted ? 'text-primary' : 'text-gray-400'
                        }`}
                        aria-label="Toggle Sound Effects"
                    >
                        {isMuted ? <IoVolumeMute size={18} /> : <IoVolumeHigh size={18} />}
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div
                className="relative rounded-3xl overflow-hidden border-2 shadow-2xl w-full max-w-[min(94vw,520px)] aspect-[21/14] flex items-center justify-center bg-black my-auto"
                style={{ borderColor: roundTheme.colors.accent }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="w-full h-full object-contain block"
                />

                {/* Speech Bubble */}
                {speech && (
                    <div className="absolute top-4 left-4 right-4 bg-white text-gray-900 font-bold text-xs p-2.5 rounded-2xl shadow-xl border-2 border-primary animate-bounce text-center z-20 pointer-events-none">
                        "{speech}"
                    </div>
                )}

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <span className="text-4xl mb-2">🏃</span>
                        <h3 className="text-2xl font-black mb-1 text-white font-mono uppercase tracking-widest">Vibe Runner</h3>
                        <p className="text-xs text-gray-300 mb-6">Tap anywhere or press Space to jump over stage gear!</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="min-h-[48px] px-8 py-3.5 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                        >
                            <IoPlay size={20} /> Start Run
                        </button>
                    </div>
                )}

                {gameState === 'paused' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <h3 className="text-2xl font-black mb-2 text-white font-mono uppercase tracking-wider">
                            Game Paused
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">Distance Score: {score}</p>
                        <div className="flex flex-col gap-2.5 w-48">
                            <button
                                onClick={togglePause}
                                className="min-h-[46px] px-6 py-2.5 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <IoPlayOutline size={18} /> Resume
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); startGame(); }}
                                className="min-h-[46px] px-6 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/10 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <IoRefresh size={18} /> Restart
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <span className="text-4xl mb-1">💥</span>
                        <h3 className="text-xl sm:text-2xl font-black text-red-500 mb-1 uppercase tracking-widest font-mono">
                            Stage Over!
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 my-3 w-48 space-y-1">
                            <p className="text-xs text-gray-400">Score: <span className="text-white font-black font-mono text-base">{score}</span></p>
                            <p className="text-xs text-gray-400">Best: <span className="text-amber-400 font-black font-mono text-base">{highScore}</span></p>
                        </div>
                        <button
                            disabled={!canRestart}
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="min-h-[48px] px-8 py-3 bg-primary hover:bg-red-600 disabled:opacity-40 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                            <IoRefresh size={18} /> Run Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
