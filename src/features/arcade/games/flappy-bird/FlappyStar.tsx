import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute, IoPause, IoPlayOutline } from 'react-icons/io5';
import { getHighScore } from '../../services/arcadeStorage';

interface FlappyStarProps {
    theme: GameTheme;
    dialogueEnabled: boolean;
    dialogueLanguage: 'auto' | 'english' | 'telugu' | 'hindi';
    songLanguage?: string;
    onBack: () => void;
}

interface Pipe {
    x: number;
    topHeight: number;
    bottomHeight: number;
    passed: boolean;
}

export const FlappyStar: React.FC<FlappyStarProps> = ({
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

    const CANVAS_WIDTH = 360;
    const CANVAS_HEIGHT = 540;
    const PIPE_WIDTH = 54;
    const PIPE_GAP = 135;
    const GRAVITY = 0.35;
    const FLAP_STRENGTH = -6.5;

    const noteYRef = useRef(220);
    const noteVelocityRef = useRef(0);
    const noteRotationRef = useRef(0);
    const pipesRef = useRef<Pipe[]>([]);
    const scoreRef = useRef(0);
    const frameIdRef = useRef<number | null>(null);

    const showDialogue = useCallback((trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score') => {
        if (!dialogueEnabled) return;
        const text = DialogueEngine.getRandomDialogue(trigger, dialogueLanguage, songLanguage);
        setSpeech(text);
        setTimeout(() => setSpeech(null), 3000);
    }, [dialogueEnabled, dialogueLanguage, songLanguage]);

    useEffect(() => {
        getHighScore('flappy-star').then(setHighScore);
    }, []);

    const flap = useCallback(() => {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState === 'gameover') {
            if (canRestart) {
                startGame();
            }
            return;
        }
        if (gameState === 'paused') {
            return;
        }
        noteVelocityRef.current = FLAP_STRENGTH;
        arcadeAudio.playJump();
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
        noteYRef.current = 220;
        noteVelocityRef.current = 0;
        noteRotationRef.current = 0;
        pipesRef.current = [
            {
                x: CANVAS_WIDTH + 50,
                topHeight: 130,
                bottomHeight: CANVAS_HEIGHT - 130 - PIPE_GAP,
                passed: false,
            },
        ];
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

        // Prevent immediate accidental restart taps on death
        setTimeout(() => setCanRestart(true), 400);

        const { isNewHighScore, highScore: newHigh } = await saveGameScore('flappy-star', scoreRef.current);
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
                flap();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [flap]);

    // Main animation loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const loop = () => {
            // Physics
            noteVelocityRef.current += GRAVITY;
            noteYRef.current += noteVelocityRef.current;

            // Rotation angle smoothly tracking velocity
            const targetRotation = Math.max(-0.45, Math.min(0.65, noteVelocityRef.current * 0.08));
            noteRotationRef.current += (targetRotation - noteRotationRef.current) * 0.2;

            // Floor boundary
            if (noteYRef.current >= CANVAS_HEIGHT - 24) {
                endGame();
                return;
            }
            // Ceiling boundary
            if (noteYRef.current < 16) {
                noteYRef.current = 16;
                noteVelocityRef.current = 0;
            }

            // Pipe updates
            const pipes = pipesRef.current;
            for (let i = 0; i < pipes.length; i++) {
                pipes[i].x -= 2.3;

                // Score check
                if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < 75) {
                    pipes[i].passed = true;
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                    arcadeAudio.playCollect();

                    if (scoreRef.current % 10 === 0) {
                        showDialogue('milestone');
                        arcadeAudio.playMilestone();
                    }
                }

                // Collision detection (Music note center: 75, noteYRef.current, radius: 15)
                const noteBox = {
                    left: 75 - 13,
                    right: 75 + 13,
                    top: noteYRef.current - 13,
                    bottom: noteYRef.current + 13,
                };

                const pipe = pipes[i];
                if (noteBox.right > pipe.x && noteBox.left < pipe.x + PIPE_WIDTH) {
                    if (noteBox.top < pipe.topHeight || noteBox.bottom > CANVAS_HEIGHT - pipe.bottomHeight) {
                        endGame();
                        return;
                    }
                }
            }

            // Remove offscreen pipes
            if (pipes.length > 0 && pipes[0].x < -PIPE_WIDTH) {
                pipes.shift();
            }

            // Spawn next pipe
            const lastPipe = pipes[pipes.length - 1];
            if (lastPipe && lastPipe.x < CANVAS_WIDTH - 170) {
                const topHeight = Math.floor(Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 140)) + 70;
                pipes.push({
                    x: CANVAS_WIDTH,
                    topHeight,
                    bottomHeight: CANVAS_HEIGHT - topHeight - PIPE_GAP,
                    passed: false,
                });
            }

            // 1. Draw Background
            ctx.fillStyle = roundTheme.colors.background;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Subtle vertical retro scan lines
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
                ctx.fillRect(0, y, CANVAS_WIDTH, 1);
            }

            // 2. Draw Speaker / Equalizer Towers
            pipes.forEach((p) => {
                // Top obstacle body
                ctx.fillStyle = roundTheme.colors.obstacle;
                ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
                // Top obstacle cap
                ctx.fillStyle = roundTheme.colors.accent;
                ctx.fillRect(p.x - 2, p.topHeight - 16, PIPE_WIDTH + 4, 16);

                // Speaker circles on top pipe if large enough
                if (p.topHeight > 60) {
                    ctx.fillStyle = roundTheme.colors.secondaryAccent;
                    ctx.beginPath();
                    ctx.arc(p.x + PIPE_WIDTH / 2, p.topHeight / 2, 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Bottom obstacle body
                ctx.fillStyle = roundTheme.colors.obstacle;
                ctx.fillRect(p.x, CANVAS_HEIGHT - p.bottomHeight, PIPE_WIDTH, p.bottomHeight);
                // Bottom obstacle cap
                ctx.fillStyle = roundTheme.colors.accent;
                ctx.fillRect(p.x - 2, CANVAS_HEIGHT - p.bottomHeight, PIPE_WIDTH + 4, 16);

                // Speaker circles on bottom pipe if large enough
                if (p.bottomHeight > 60) {
                    ctx.fillStyle = roundTheme.colors.secondaryAccent;
                    ctx.beginPath();
                    ctx.arc(p.x + PIPE_WIDTH / 2, CANVAS_HEIGHT - p.bottomHeight / 2, 10, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 3. Draw Animated Music Note (♪) Character
            const noteY = noteYRef.current;
            const noteX = 75;

            ctx.save();
            ctx.translate(noteX, noteY);
            ctx.rotate(noteRotationRef.current);

            // Neon Music Note Glow
            ctx.shadowColor = roundTheme.colors.accent;
            ctx.shadowBlur = 12;

            // Note Head (Tilted ellipse)
            ctx.fillStyle = roundTheme.colors.character;
            ctx.beginPath();
            ctx.ellipse(-4, 6, 9, 7, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Note Stem
            ctx.fillStyle = roundTheme.colors.character;
            ctx.fillRect(3, -12, 4, 18);

            // Note Flag / Hook (♪)
            ctx.beginPath();
            ctx.moveTo(7, -12);
            ctx.bezierCurveTo(16, -10, 15, -2, 8, 2);
            ctx.lineTo(7, 0);
            ctx.bezierCurveTo(12, -4, 12, -8, 7, -10);
            ctx.closePath();
            ctx.fill();

            // Pixel-art highlight on head
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-6, 3, 3, 3);

            ctx.restore();

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [gameState, roundTheme]);

    return (
        <div
            onClick={flap}
            className={`fixed inset-0 z-[400] md:relative md:inset-auto flex flex-col items-center justify-center select-none bg-black md:bg-transparent touch-none ${
                gameState === 'playing' ? 'p-0' : 'p-2 sm:p-4'
            }`}
        >
            {/* Minimal HUD during Active Gameplay */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                    className="pointer-events-auto p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full border border-white/15 shadow-lg active:scale-95 transition-all"
                    aria-label="Back to Arcade"
                >
                    <IoArrowBack size={20} />
                </button>

                <div className="flex flex-col items-center">
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
                            className="p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full border border-white/15 shadow-lg active:scale-95 transition-all"
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
                        className={`p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full border border-white/15 shadow-lg active:scale-95 transition-all ${
                            !isMuted ? 'text-primary' : 'text-gray-400'
                        }`}
                        aria-label="Toggle Sound Effects"
                    >
                        {isMuted ? <IoVolumeMute size={18} /> : <IoVolumeHigh size={18} />}
                    </button>
                </div>
            </div>

            {/* Responsive Full-Screen / Fluid Canvas Container */}
            <div
                className="relative w-full h-full md:max-w-[min(92vw,360px)] md:aspect-[3/4] md:rounded-3xl overflow-hidden border-0 md:border-2 shadow-2xl flex items-center justify-center bg-black"
                style={{ borderColor: roundTheme.colors.accent }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="w-full h-full object-cover md:object-contain block"
                />

                {/* Speech Bubble Notification */}
                {speech && (
                    <div className="absolute top-16 left-6 right-6 z-20 bg-white/95 text-gray-900 font-bold text-xs p-2.5 rounded-2xl shadow-xl border-2 border-primary animate-bounce text-center backdrop-blur-md pointer-events-none">
                        "{speech}"
                    </div>
                )}

                {/* Pre-Game Start Screen */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-4xl mb-3 text-primary animate-bounce">
                            ♪
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black mb-1 text-white font-mono uppercase tracking-wider">
                            Flappy Star
                        </h3>
                        <p className="text-xs text-gray-300 mb-6">
                            Tap anywhere on screen to fly the music note!
                        </p>
                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="min-h-[48px] px-8 py-3.5 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 transition-all uppercase tracking-wider flex items-center gap-2"
                        >
                            <IoPlay size={20} /> Tap To Play
                        </button>
                    </div>
                )}

                {/* Paused Screen */}
                {gameState === 'paused' && (
                    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-2xl font-black mb-2 text-white font-mono uppercase tracking-wider">
                            Game Paused
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">Current Score: {score}</p>
                        <button
                            onClick={togglePause}
                            className="min-h-[48px] px-8 py-3 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 transition-all uppercase tracking-wider flex items-center gap-2"
                        >
                            <IoPlayOutline size={20} /> Resume
                        </button>
                    </div>
                )}

                {/* Game Over Screen */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-3xl mb-1">💥</span>
                        <h3 className="text-xl sm:text-2xl font-black text-red-500 mb-1 uppercase tracking-wider">
                            Stage Cleared!
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-4 w-48 space-y-1">
                            <p className="text-xs text-gray-400">Score: <span className="text-white font-bold font-mono text-base">{score}</span></p>
                            <p className="text-xs text-gray-400">Best: <span className="text-amber-400 font-bold font-mono text-base">{highScore}</span></p>
                        </div>
                        <button
                            disabled={!canRestart}
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="min-h-[48px] px-8 py-3 bg-primary hover:bg-red-600 disabled:opacity-40 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center gap-2 uppercase tracking-wider"
                        >
                            <IoRefresh size={20} /> Play Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
