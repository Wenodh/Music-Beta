import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { Game2048Engine, Direction } from './game2048Engine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoArrowBack, IoTrophyOutline } from 'react-icons/io5';

interface Game2048Props {
    theme: GameTheme;
    onBack: () => void;
}

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
    2: { bg: 'bg-white/10 border-white/20', text: 'text-white' },
    4: { bg: 'bg-white/20 border-white/30', text: 'text-white' },
    8: { bg: 'bg-amber-500/30 border-amber-500/50', text: 'text-amber-300' },
    16: { bg: 'bg-orange-500/40 border-orange-500/60', text: 'text-orange-300' },
    32: { bg: 'bg-rose-500/40 border-rose-500/60', text: 'text-rose-300' },
    64: { bg: 'bg-red-600/50 border-red-600/70', text: 'text-white' },
    128: { bg: 'bg-yellow-400/50 border-yellow-400/70', text: 'text-yellow-200' },
    256: { bg: 'bg-emerald-500/50 border-emerald-500/70', text: 'text-emerald-200' },
    512: { bg: 'bg-cyan-500/50 border-cyan-500/70', text: 'text-cyan-200' },
    1024: { bg: 'bg-blue-600/50 border-blue-600/70', text: 'text-blue-200' },
    2048: { bg: 'bg-purple-600/60 border-purple-500 shadow-lg shadow-purple-500/50', text: 'text-white font-black' },
};

export const Game2048: React.FC<Game2048Props> = ({ theme, onBack }) => {
    const [grid, setGrid] = useState<number[][]>(() => {
        let g = Game2048Engine.createEmptyGrid();
        g = Game2048Engine.spawnRandomTile(g).grid;
        g = Game2048Engine.spawnRandomTile(g).grid;
        return g;
    });
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    useEffect(() => {
        getHighScore('2048-beat').then(setBestScore);
    }, []);

    const resetGame = useCallback(() => {
        let g = Game2048Engine.createEmptyGrid();
        g = Game2048Engine.spawnRandomTile(g).grid;
        g = Game2048Engine.spawnRandomTile(g).grid;
        setGrid(g);
        setScore(0);
        setGameState('playing');
    }, [setGameState]);

    useEffect(() => {
        resetGame();
    }, []);

    const handleMove = useCallback(async (dir: Direction) => {
        if (gameState !== 'playing') return;

        const res = Game2048Engine.move(grid, dir);
        if (res.moved) {
            arcadeAudio.playJump();
            const afterSpawn = Game2048Engine.spawnRandomTile(res.grid);
            setGrid(afterSpawn.grid);
            const newScore = score + res.score;
            setScore(newScore);

            if (res.mergedPoints >= 32) {
                arcadeAudio.playCollect();
            }

            if (Game2048Engine.isGameOver(afterSpawn.grid)) {
                setGameState('gameover');
                arcadeAudio.playCollision();

                await ArcadeLeaderboardService.submitScore({
                    gameId: '2048-beat',
                    metricType: 'points',
                    score: newScore,
                    displayValue: `${newScore.toLocaleString()} pts`,
                });

                const updated = await getHighScore('2048-beat');
                setBestScore(updated);
            }
        }
    }, [gameState, grid, score, setGameState]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) handleMove('up');
            else if (['ArrowDown', 'KeyS'].includes(e.code)) handleMove('down');
            else if (['ArrowLeft', 'KeyA'].includes(e.code)) handleMove('left');
            else if (['ArrowRight', 'KeyD'].includes(e.code)) handleMove('right');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleMove]);

    // Touch swipe controls
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;

        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
            if (Math.abs(dx) > Math.abs(dy)) {
                handleMove(dx > 0 ? 'right' : 'left');
            } else {
                handleMove(dy > 0 ? 'down' : 'up');
            }
        }
        touchStartRef.current = null;
    };

    return (
        <ArcadeGameShell
            title="2048 Beat"
            scoreDisplay={score.toLocaleString()}
            highScoreDisplay={bestScore > 0 ? bestScore.toLocaleString() : undefined}
            isMuted={isMuted}
            onToggleMute={() => {
                const next = !isMuted;
                setIsMuted(next);
                arcadeAudio.setEnabled(!next);
            }}
            onPause={pauseGame}
            showExitModal={showExitConfirm}
            onResume={resumeGame}
            onRestart={resetGame}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-4 p-2">
                {/* 4x4 Vinyl Board */}
                <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="relative border-2 border-white/20 rounded-3xl overflow-hidden shadow-2xl bg-black/70 w-full max-w-[min(90vw,340px)] aspect-square p-2.5 grid grid-cols-4 grid-rows-4 gap-2"
                >
                    {grid.map((row, r) =>
                        row.map((val, c) => {
                            const tileStyle = TILE_COLORS[val] || (val > 2048 ? TILE_COLORS[2048] : { bg: 'bg-white/5 border-white/5', text: 'text-transparent' });

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`rounded-2xl border flex flex-col items-center justify-center transition-all duration-150 select-none ${
                                        val > 0 ? tileStyle.bg : 'bg-white/5 border-white/5'
                                    }`}
                                >
                                    {val > 0 && (
                                        <>
                                            <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${tileStyle.text}`}>
                                                {val}
                                            </span>
                                            {val >= 128 && (
                                                <span className="text-[9px] uppercase tracking-wider text-white/60 font-bold">
                                                    Vinyl
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <p className="text-[11px] text-gray-400 text-center max-w-xs">
                    Swipe or use arrow keys to combine identical tracks up to 2048.
                </p>

                {/* Game Over Overlay */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <span className="text-4xl mb-2">💥</span>
                        <h3 className="text-2xl font-black text-red-500 uppercase tracking-wider mb-1">
                            No More Moves!
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Final Score: <span className="text-white font-bold">{score.toLocaleString()}</span></p>
                        <button
                            onClick={resetGame}
                            className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <IoRefresh size={16} /> Play Again
                        </button>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
