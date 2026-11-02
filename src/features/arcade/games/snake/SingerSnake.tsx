import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore, getHighScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute, IoPause, IoPlayOutline } from 'react-icons/io5';

interface SingerSnakeProps {
    theme: GameTheme;
    dialogueEnabled: boolean;
    dialogueLanguage: 'auto' | 'english' | 'telugu' | 'hindi';
    songLanguage?: string;
    onBack: () => void;
}

interface Point {
    x: number;
    y: number;
}

export const SingerSnake: React.FC<SingerSnakeProps> = ({
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

    // Beginner friendly grid: 18x18 cells, generous size
    const GRID_SIZE = 18;
    const CELL_SIZE = 20;

    const snakeRef = useRef<Point[]>([{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]);
    const dirRef = useRef<Point>({ x: 1, y: 0 });
    const nextDirRef = useRef<Point>({ x: 1, y: 0 });
    const foodRef = useRef<Point>({ x: 13, y: 9 });
    const specialItemRef = useRef<Point | null>(null);

    const scoreRef = useRef(0);
    const roundThemeRef = useRef(roundTheme);
    roundThemeRef.current = roundTheme;

    useEffect(() => {
        getHighScore('singer-snake').then(setHighScore);
    }, []);

    const showDialogue = useCallback((trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score') => {
        if (!dialogueEnabled) return;
        const text = DialogueEngine.getRandomDialogue(trigger, dialogueLanguage, songLanguage);
        setSpeech(text);
        setTimeout(() => setSpeech(null), 3000);
    }, [dialogueEnabled, dialogueLanguage, songLanguage]);

    const spawnFood = (snake: Point[]): Point => {
        while (true) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);
            if (!snake.some(p => p.x === x && p.y === y)) {
                return { x, y };
            }
        }
    };

    const togglePause = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (gameState === 'playing') {
            setGameState('paused');
        } else if (gameState === 'paused') {
            setGameState('playing');
        }
    };

    const startGame = () => {
        snakeRef.current = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
        dirRef.current = { x: 1, y: 0 };
        nextDirRef.current = { x: 1, y: 0 };
        foodRef.current = spawnFood(snakeRef.current);
        specialItemRef.current = null;
        scoreRef.current = 0;
        setScore(0);
        setCanRestart(false);
        setGameState('playing');
        showDialogue('start');
    };

    const endGame = async () => {
        setGameState('gameover');
        arcadeAudio.playCollision();

        // Guard against accidental restart tap
        setTimeout(() => setCanRestart(true), 400);

        const { isNewHighScore, highScore: newHigh } = await saveGameScore('singer-snake', scoreRef.current);
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
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'KeyP'].includes(e.code)) {
                e.preventDefault();
            }

            if (e.code === 'KeyP' || e.code === 'Escape') {
                togglePause();
                return;
            }

            if (gameState === 'idle' || (gameState === 'gameover' && canRestart)) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    startGame();
                    return;
                }
            }

            const cur = dirRef.current;
            if ((e.code === 'ArrowUp' || e.code === 'KeyW') && cur.y === 0) nextDirRef.current = { x: 0, y: -1 };
            if ((e.code === 'ArrowDown' || e.code === 'KeyS') && cur.y === 0) nextDirRef.current = { x: 0, y: 1 };
            if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && cur.x === 0) nextDirRef.current = { x: -1, y: 0 };
            if ((e.code === 'ArrowRight' || e.code === 'KeyD') && cur.x === 0) nextDirRef.current = { x: 1, y: 0 };
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, canRestart]);

    // Swipe Touch controls
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const touch = e.changedTouches[0];
        const diffX = touch.clientX - touchStartRef.current.x;
        const diffY = touch.clientY - touchStartRef.current.y;

        if (Math.abs(diffX) > 20 || Math.abs(diffY) > 20) {
            if (gameState === 'idle') {
                startGame();
                return;
            }
            if (gameState === 'gameover' && canRestart) {
                startGame();
                return;
            }
            if (Math.abs(diffX) > Math.abs(diffY)) {
                handleTouchDirection(diffX > 0 ? 1 : -1, 0);
            } else {
                handleTouchDirection(0, diffY > 0 ? 1 : -1);
            }
        }
        touchStartRef.current = null;
    };

    // D-Pad touch handlers
    const handleTouchDirection = (x: number, y: number) => {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState === 'gameover' && canRestart) {
            startGame();
            return;
        }
        if (gameState !== 'playing') return;

        const cur = dirRef.current;
        if (x !== 0 && cur.x === 0) nextDirRef.current = { x, y: 0 };
        if (y !== 0 && cur.y === 0) nextDirRef.current = { x: 0, y };
    };

    // Beginner friendly game tick: 155ms (comfortable turn reaction time vs 110ms)
    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            const snake = [...snakeRef.current];
            const dir = nextDirRef.current;
            dirRef.current = dir;

            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

            // Wall wrap-around or collision: wall collision with clear boundary
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
                endGame();
                return;
            }

            // Self collision (ignore tail during move)
            if (snake.slice(0, -1).some(segment => segment.x === head.x && segment.y === head.y)) {
                endGame();
                return;
            }

            snake.unshift(head);

            // Food collision
            if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
                scoreRef.current += 10;
                setScore(scoreRef.current);
                arcadeAudio.playCollect();
                foodRef.current = spawnFood(snake);

                // Milestone triggers
                if (scoreRef.current % 50 === 0) {
                    showDialogue('milestone');
                    arcadeAudio.playMilestone();
                }

                // Chance to spawn special collectible
                if (!specialItemRef.current && Math.random() < 0.35) {
                    specialItemRef.current = spawnFood(snake);
                }
            } else if (specialItemRef.current && head.x === specialItemRef.current.x && head.y === specialItemRef.current.y) {
                scoreRef.current += 25;
                setScore(scoreRef.current);
                specialItemRef.current = null;
                arcadeAudio.playCollect();
                showDialogue('special-item');
            } else {
                snake.pop();
            }

            snakeRef.current = snake;

            // Render to canvas
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const colors = roundThemeRef.current.colors;

            // Draw Background
            ctx.fillStyle = colors.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid Lines (Subtle retro arcade feel)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= GRID_SIZE; i++) {
                ctx.beginPath();
                ctx.moveTo(i * CELL_SIZE, 0);
                ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, i * CELL_SIZE);
                ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
                ctx.stroke();
            }

            // Draw Normal Music Note Food
            const food = foodRef.current;
            ctx.fillStyle = colors.collectible;
            ctx.beginPath();
            ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2.3, 0, Math.PI * 2);
            ctx.fill();

            // Note stem & flag
            ctx.strokeStyle = colors.collectible;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(food.x * CELL_SIZE + CELL_SIZE / 1.5, food.y * CELL_SIZE + CELL_SIZE / 2);
            ctx.lineTo(food.x * CELL_SIZE + CELL_SIZE / 1.5, food.y * CELL_SIZE + CELL_SIZE / 5);
            ctx.stroke();

            // Draw Special Collectible if active
            if (specialItemRef.current) {
                const spec = specialItemRef.current;
                ctx.fillStyle = colors.secondaryAccent;
                ctx.beginPath();
                ctx.arc(spec.x * CELL_SIZE + CELL_SIZE / 2, spec.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(spec.x * CELL_SIZE + CELL_SIZE / 2, spec.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Snake
            snake.forEach((segment, idx) => {
                ctx.fillStyle = idx === 0 ? colors.character : colors.accent;
                ctx.fillRect(segment.x * CELL_SIZE + 1.5, segment.y * CELL_SIZE + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);

                // Head eyes
                if (idx === 0) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(segment.x * CELL_SIZE + 4, segment.y * CELL_SIZE + 4, 3.5, 3.5);
                    ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - 7.5, segment.y * CELL_SIZE + 4, 3.5, 3.5);
                }
            });
        }, 155);

        return () => clearInterval(interval);
    }, [gameState]);

    const toggleAudio = () => {
        const next = !isMuted;
        setIsMuted(next);
        arcadeAudio.setEnabled(!next);
    };

    return (
        <div className="fixed inset-0 z-[400] md:relative md:inset-auto flex flex-col items-center justify-between select-none bg-black md:bg-transparent touch-none h-[100dvh] w-full max-w-full overflow-hidden p-3 sm:p-4">
            {/* Top HUD */}
            <div className="w-full flex items-center justify-between z-20">
                <button
                    onClick={onBack}
                    className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all"
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

                <div className="flex items-center gap-2">
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
                        onClick={toggleAudio}
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
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative rounded-3xl overflow-hidden border-2 shadow-2xl touch-none w-full max-w-[min(90vw,360px)] aspect-square flex items-center justify-center bg-black my-auto"
                style={{ borderColor: roundTheme.colors.accent }}
            >
                <canvas
                    ref={canvasRef}
                    width={GRID_SIZE * CELL_SIZE}
                    height={GRID_SIZE * CELL_SIZE}
                    className="w-full h-full object-contain block"
                />

                {/* Speech Bubble Reaction */}
                {speech && (
                    <div className="absolute top-4 left-4 right-4 bg-white text-gray-900 font-bold text-xs p-2.5 rounded-2xl shadow-xl border-2 border-primary animate-bounce text-center z-20 pointer-events-none">
                        "{speech}"
                    </div>
                )}

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <span className="text-4xl mb-2">🐍</span>
                        <h3 className="text-2xl font-black mb-1 text-white font-mono uppercase tracking-widest">Singer Snake</h3>
                        <p className="text-xs text-gray-300 mb-6">Swipe or use arrows to collect notes and grow!</p>
                        <button
                            onClick={startGame}
                            className="min-h-[48px] px-8 py-3.5 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                        >
                            <IoPlay size={20} /> Play Game
                        </button>
                    </div>
                )}

                {gameState === 'paused' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <h3 className="text-2xl font-black mb-2 text-white font-mono uppercase tracking-wider">
                            Game Paused
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">Current Score: {score}</p>
                        <div className="flex flex-col gap-2.5 w-48">
                            <button
                                onClick={togglePause}
                                className="min-h-[46px] px-6 py-2.5 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <IoPlayOutline size={18} /> Resume
                            </button>
                            <button
                                onClick={startGame}
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
                            Out of Rhythm!
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 my-3 w-48 space-y-1">
                            <p className="text-xs text-gray-400">Score: <span className="text-white font-black font-mono text-base">{score}</span></p>
                            <p className="text-xs text-gray-400">Best: <span className="text-amber-400 font-black font-mono text-base">{highScore}</span></p>
                        </div>
                        <button
                            disabled={!canRestart}
                            onClick={startGame}
                            className="min-h-[48px] px-8 py-3 bg-primary hover:bg-red-600 disabled:opacity-40 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                            <IoRefresh size={18} /> Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Touch D-Pad */}
            <div className="grid grid-cols-3 gap-2 w-56 mb-4 sm:hidden z-20">
                <div />
                <button
                    onClick={() => handleTouchDirection(0, -1)}
                    className="h-12 flex items-center justify-center bg-white/15 active:bg-primary/40 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all"
                    aria-label="Up"
                >
                    ▲
                </button>
                <div />
                <button
                    onClick={() => handleTouchDirection(-1, 0)}
                    className="h-12 flex items-center justify-center bg-white/15 active:bg-primary/40 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all"
                    aria-label="Left"
                >
                    ◀
                </button>
                <div />
                <button
                    onClick={() => handleTouchDirection(1, 0)}
                    className="h-12 flex items-center justify-center bg-white/15 active:bg-primary/40 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all"
                    aria-label="Right"
                >
                    ▶
                </button>
                <div />
                <button
                    onClick={() => handleTouchDirection(0, 1)}
                    className="h-12 flex items-center justify-center bg-white/15 active:bg-primary/40 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-95 transition-all"
                    aria-label="Down"
                >
                    ▼
                </button>
                <div />
            </div>
        </div>
    );
};
