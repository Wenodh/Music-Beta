import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';

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
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
    const [speech, setSpeech] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);

    const CANVAS_WIDTH = 420;
    const CANVAS_HEIGHT = 260;
    const GROUND_Y = 210;

    const playerYRef = useRef(GROUND_Y - 32);
    const playerVelYRef = useRef(0);
    const isGroundedRef = useRef(true);

    const obstaclesRef = useRef<Obstacle[]>([]);
    const collectiblesRef = useRef<Collectible[]>([]);
    const speedRef = useRef(4.0);
    const scoreRef = useRef(0);
    const frameIdRef = useRef<number | null>(null);

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
            startGame();
            return;
        }
        if (isGroundedRef.current) {
            playerVelYRef.current = -9.5;
            isGroundedRef.current = false;
            arcadeAudio.playJump();
        }
    }, [gameState]);

    const startGame = () => {
        playerYRef.current = GROUND_Y - 32;
        playerVelYRef.current = 0;
        isGroundedRef.current = true;
        obstaclesRef.current = [{ x: CANVAS_WIDTH + 80, width: 22, height: 35 }];
        collectiblesRef.current = [{ x: CANVAS_WIDTH + 140, y: GROUND_Y - 55, collected: false }];
        speedRef.current = 4.0;
        scoreRef.current = 0;
        setScore(0);
        setGameState('playing');
        showDialogue('start');
    };

    const endGame = async () => {
        setGameState('gameover');
        if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        arcadeAudio.playCollision();

        const { isNewHighScore } = await saveGameScore('vibe-runner', scoreRef.current);
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
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump]);

    // Game loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const loop = () => {
            // Player jump physics
            playerVelYRef.current += 0.55;
            playerYRef.current += playerVelYRef.current;

            if (playerYRef.current >= GROUND_Y - 32) {
                playerYRef.current = GROUND_Y - 32;
                playerVelYRef.current = 0;
                isGroundedRef.current = true;
            }

            // Gradually speed up
            speedRef.current += 0.0006;
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

                // Collision detection
                const playerBox = {
                    left: 50,
                    right: 76,
                    top: playerYRef.current,
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
            if (!lastObs || lastObs.x < CANVAS_WIDTH - Math.random() * 120 - 150) {
                obstacles.push({
                    x: CANVAS_WIDTH + Math.random() * 40,
                    width: 22,
                    height: Math.random() < 0.5 ? 30 : 42,
                });
            }

            // Collectibles (Vinyl records / Notes)
            const collectibles = collectiblesRef.current;
            for (let i = 0; i < collectibles.length; i++) {
                collectibles[i].x -= currentSpeed;

                if (!collectibles[i].collected) {
                    const dist = Math.hypot(collectibles[i].x - 63, collectibles[i].y - (playerYRef.current + 16));
                    if (dist < 24) {
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
        <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto p-4 select-none">
            {/* Header Toolbar */}
            <div className="w-full flex items-center justify-between mb-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all"
                >
                    <IoArrowBack size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Vibe Runner</span>
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
                onClick={jump}
                className="relative rounded-2xl overflow-hidden border-2 shadow-2xl cursor-pointer w-full"
                style={{ borderColor: roundTheme.colors.accent }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="bg-black block w-full h-auto"
                />

                {/* Speech Bubble */}
                {speech && (
                    <div className="absolute top-4 left-4 right-4 bg-white text-gray-900 font-bold text-xs p-2 rounded-2xl shadow-xl border-2 border-primary animate-bounce text-center">
                        "{speech}"
                    </div>
                )}

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-2xl font-black mb-2 text-white font-mono uppercase tracking-widest">Vibe Runner</h3>
                        <p className="text-xs text-gray-400 mb-6">Tap or press Space to jump over stage obstacles!</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-red-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/30 transition-all uppercase tracking-wider"
                        >
                            <IoPlay size={20} /> Start Run
                        </button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-xl font-black text-red-500 mb-1 uppercase tracking-widest">Trip on the Mic Cable!</h3>
                        <p className="text-sm font-bold text-gray-300 mb-4">Distance Score: <span className="text-primary font-mono">{score}</span></p>
                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                        >
                            <IoRefresh size={18} /> Run Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
