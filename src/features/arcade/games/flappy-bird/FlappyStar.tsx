import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';

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
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
    const [speech, setSpeech] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);

    const CANVAS_WIDTH = 360;
    const CANVAS_HEIGHT = 480;
    const PIPE_WIDTH = 52;
    const PIPE_GAP = 125;
    const GRAVITY = 0.32;
    const FLAP_STRENGTH = -6.2;

    const starYRef = useRef(200);
    const starVelocityRef = useRef(0);
    const pipesRef = useRef<Pipe[]>([]);
    const scoreRef = useRef(0);
    const frameIdRef = useRef<number | null>(null);

    const showDialogue = useCallback((trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score') => {
        if (!dialogueEnabled) return;
        const text = DialogueEngine.getRandomDialogue(trigger, dialogueLanguage, songLanguage);
        setSpeech(text);
        setTimeout(() => setSpeech(null), 3000);
    }, [dialogueEnabled, dialogueLanguage, songLanguage]);

    const flap = useCallback(() => {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState === 'gameover') {
            startGame();
            return;
        }
        starVelocityRef.current = FLAP_STRENGTH;
        arcadeAudio.playJump();
    }, [gameState]);

    const startGame = () => {
        starYRef.current = 200;
        starVelocityRef.current = 0;
        pipesRef.current = [
            {
                x: CANVAS_WIDTH + 50,
                topHeight: 120,
                bottomHeight: CANVAS_HEIGHT - 120 - PIPE_GAP,
                passed: false,
            },
        ];
        scoreRef.current = 0;
        setScore(0);
        setGameState('playing');
        showDialogue('start');
    };

    const endGame = async () => {
        setGameState('gameover');
        if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        arcadeAudio.playCollision();

        const { isNewHighScore } = await saveGameScore('flappy-star', scoreRef.current);
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
            starVelocityRef.current += GRAVITY;
            starYRef.current += starVelocityRef.current;

            // Boundaries
            if (starYRef.current >= CANVAS_HEIGHT - 20) {
                endGame();
                return;
            }
            if (starYRef.current < 0) {
                starYRef.current = 0;
                starVelocityRef.current = 0;
            }

            // Pipe updates
            const pipes = pipesRef.current;
            for (let i = 0; i < pipes.length; i++) {
                pipes[i].x -= 2.2;

                // Score check
                if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < 70) {
                    pipes[i].passed = true;
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                    arcadeAudio.playCollect();

                    if (scoreRef.current % 10 === 0) {
                        showDialogue('milestone');
                        arcadeAudio.playMilestone();
                    }
                }

                // Collision detection (Star: x: 70, y: starYRef.current, radius: 14)
                const starBox = {
                    left: 70 - 12,
                    right: 70 + 12,
                    top: starYRef.current - 12,
                    bottom: starYRef.current + 12,
                };

                const pipe = pipes[i];
                if (starBox.right > pipe.x && starBox.left < pipe.x + PIPE_WIDTH) {
                    if (starBox.top < pipe.topHeight || starBox.bottom > CANVAS_HEIGHT - pipe.bottomHeight) {
                        endGame();
                        return;
                    }
                }
            }

            // Remove offscreen pipes & spawn new ones
            if (pipes.length > 0 && pipes[0].x < -PIPE_WIDTH) {
                pipes.shift();
            }

            const lastPipe = pipes[pipes.length - 1];
            if (lastPipe && lastPipe.x < CANVAS_WIDTH - 160) {
                const topHeight = Math.floor(Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 120)) + 60;
                pipes.push({
                    x: CANVAS_WIDTH,
                    topHeight,
                    bottomHeight: CANVAS_HEIGHT - topHeight - PIPE_GAP,
                    passed: false,
                });
            }

            // Draw Background
            ctx.fillStyle = roundTheme.colors.background;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw Speaker / Equalizer Pipes
            pipes.forEach((p) => {
                // Top obstacle
                ctx.fillStyle = roundTheme.colors.obstacle;
                ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
                // Obstacle border cap
                ctx.fillStyle = roundTheme.colors.accent;
                ctx.fillRect(p.x - 2, p.topHeight - 16, PIPE_WIDTH + 4, 16);

                // Bottom obstacle
                ctx.fillStyle = roundTheme.colors.obstacle;
                ctx.fillRect(p.x, CANVAS_HEIGHT - p.bottomHeight, PIPE_WIDTH, p.bottomHeight);
                // Obstacle border cap
                ctx.fillStyle = roundTheme.colors.accent;
                ctx.fillRect(p.x - 2, CANVAS_HEIGHT - p.bottomHeight, PIPE_WIDTH + 4, 16);
            });

            // Draw Pixel Star Character
            const starY = starYRef.current;
            ctx.fillStyle = roundTheme.colors.character;
            ctx.beginPath();
            ctx.arc(70, starY, 14, 0, Math.PI * 2);
            ctx.fill();

            // Retro Star Glares
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(66, starY - 5, 4, 4);
            ctx.fillRect(74, starY - 5, 4, 4);

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [gameState, roundTheme]);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 select-none">
            {/* Header Toolbar */}
            <div className="w-full flex items-center justify-between mb-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
                >
                    <IoArrowBack size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Flappy Star</span>
                    <span className="text-xl font-black font-mono tracking-wider">{score} pts</span>
                </div>
                <button
                    onClick={() => {
                        const next = !isMuted;
                        setIsMuted(next);
                        arcadeAudio.setEnabled(!next);
                    }}
                    className={`p-2 rounded-xl border transition-all ${!isMuted ? 'text-primary border-primary/30 bg-primary/10' : 'text-gray-400 border-white/10'}`}
                >
                    {isMuted ? <IoVolumeMute size={20} /> : <IoVolumeHigh size={20} />}
                </button>
            </div>

            {/* Tap Container */}
            <div
                onClick={flap}
                className="relative rounded-2xl overflow-hidden border-2 shadow-2xl cursor-pointer w-full max-w-[min(92vw,360px)] aspect-[3/4] flex items-center justify-center bg-black touch-none"
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
                    <div className="absolute top-4 left-4 right-4 bg-white text-gray-900 font-bold text-xs p-2.5 rounded-2xl shadow-xl border-2 border-primary animate-bounce text-center">
                        "{speech}"
                    </div>
                )}

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-2xl font-black mb-2 text-white font-mono uppercase tracking-widest">Flappy Star</h3>
                        <p className="text-xs text-gray-400 mb-6">Tap or press Space to fly between the music towers!</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-red-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/30 transition-all uppercase tracking-wider"
                        >
                            <IoPlay size={20} /> Start Flapping
                        </button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-xl font-black text-red-500 mb-1 uppercase tracking-widest">Stage Cleared... Almost!</h3>
                        <p className="text-sm font-bold text-gray-300 mb-4">Pipes Passed: <span className="text-primary font-mono">{score}</span></p>
                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                        >
                            <IoRefresh size={18} /> Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
