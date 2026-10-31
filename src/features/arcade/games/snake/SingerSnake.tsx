import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';

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
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
    const [speech, setSpeech] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);

    const GRID_SIZE = 20;
    const CELL_SIZE = 18;

    const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
    const dirRef = useRef<Point>({ x: 1, y: 0 });
    const nextDirRef = useRef<Point>({ x: 1, y: 0 });
    const foodRef = useRef<Point>({ x: 15, y: 10 });
    const specialItemRef = useRef<Point | null>(null);

    const scoreRef = useRef(0);
    const roundThemeRef = useRef(roundTheme);
    roundThemeRef.current = roundTheme;

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

    const startGame = () => {
        snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dirRef.current = { x: 1, y: 0 };
        nextDirRef.current = { x: 1, y: 0 };
        foodRef.current = spawnFood(snakeRef.current);
        specialItemRef.current = null;
        scoreRef.current = 0;
        setScore(0);
        setGameState('playing');
        showDialogue('start');
    };

    const endGame = async () => {
        setGameState('gameover');
        arcadeAudio.playCollision();
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
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            if (gameState === 'idle' || gameState === 'gameover') {
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
    }, [gameState]);

    // Touch controls: D-Pad touch handlers
    const handleTouchDirection = (x: number, y: number) => {
        const cur = dirRef.current;
        if (x !== 0 && cur.x === 0) nextDirRef.current = { x, y: 0 };
        if (y !== 0 && cur.y === 0) nextDirRef.current = { x: 0, y };
    };

    // Game loop
    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            const snake = [...snakeRef.current];
            const dir = nextDirRef.current;
            dirRef.current = dir;

            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

            // Wall collision
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
                endGame();
                return;
            }

            // Self collision
            if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
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
            ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Note stem
            ctx.strokeStyle = colors.collectible;
            ctx.lineWidth = 2;
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
                ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

                // Head eyes
                if (idx === 0) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(segment.x * CELL_SIZE + 4, segment.y * CELL_SIZE + 4, 3, 3);
                    ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - 7, segment.y * CELL_SIZE + 4, 3, 3);
                }
            });
        }, 110);

        return () => clearInterval(interval);
    }, [gameState]);

    const toggleAudio = () => {
        const next = !isMuted;
        setIsMuted(next);
        arcadeAudio.setEnabled(!next);
    };

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
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Singer Snake</span>
                    <span className="text-xl font-black font-mono tracking-wider">{score} pts</span>
                </div>
                <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-xl border transition-all ${!isMuted ? 'text-primary border-primary/30 bg-primary/10' : 'text-gray-400 border-white/10'}`}
                >
                    {isMuted ? <IoVolumeMute size={20} /> : <IoVolumeHigh size={20} />}
                </button>
            </div>

            {/* Canvas Container with Speech Bubble */}
            <div className="relative rounded-2xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: roundTheme.colors.accent }}>
                <canvas
                    ref={canvasRef}
                    width={GRID_SIZE * CELL_SIZE}
                    height={GRID_SIZE * CELL_SIZE}
                    className="bg-black block"
                />

                {/* Speech Bubble Reaction */}
                {speech && (
                    <div className="absolute top-4 left-4 right-4 bg-white text-gray-900 font-bold text-xs p-2.5 rounded-2xl shadow-xl border-2 border-primary animate-bounce text-center">
                        "{speech}"
                    </div>
                )}

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-2xl font-black mb-2 text-white font-mono uppercase tracking-widest">Singer Snake</h3>
                        <p className="text-xs text-gray-400 mb-6">Collect music notes and grow your melody trail!</p>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-red-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/30 transition-all uppercase tracking-wider"
                        >
                            <IoPlay size={20} /> Play Game
                        </button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-xl font-black text-red-500 mb-1 uppercase tracking-widest">Out of Rhythm!</h3>
                        <p className="text-sm font-bold text-gray-300 mb-4">Final Score: <span className="text-primary font-mono">{score}</span></p>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                        >
                            <IoRefresh size={18} /> Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Touch D-Pad */}
            <div className="grid grid-cols-3 gap-2 w-48 mt-6 sm:hidden">
                <div />
                <button
                    onClick={() => handleTouchDirection(0, -1)}
                    className="p-3.5 bg-white/10 active:bg-primary/30 rounded-2xl font-bold text-white text-center"
                >
                    ▲
                </button>
                <div />
                <button
                    onClick={() => handleTouchDirection(-1, 0)}
                    className="p-3.5 bg-white/10 active:bg-primary/30 rounded-2xl font-bold text-white text-center"
                >
                    ◀
                </button>
                <div />
                <button
                    onClick={() => handleTouchDirection(1, 0)}
                    className="p-3.5 bg-white/10 active:bg-primary/30 rounded-2xl font-bold text-white text-center"
                >
                    ▶
                </button>
                <div />
                <button
                    onClick={() => handleTouchDirection(0, 1)}
                    className="p-3.5 bg-white/10 active:bg-primary/30 rounded-2xl font-bold text-white text-center"
                >
                    ▼
                </button>
                <div />
            </div>
        </div>
    );
};
