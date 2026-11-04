import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { QueensEngine, QueensCellState, QueensPuzzle } from './queensEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoTrophyOutline } from 'react-icons/io5';

interface QueensGameProps {
    theme: GameTheme;
    onBack: () => void;
}

const REGION_COLORS = [
    'rgba(147, 51, 234, 0.25)', // purple
    'rgba(59, 130, 246, 0.25)', // blue
    'rgba(16, 185, 129, 0.25)', // emerald
    'rgba(245, 158, 11, 0.25)', // amber
    'rgba(239, 68, 68, 0.25)',  // red
    'rgba(236, 72, 153, 0.25)', // pink
    'rgba(14, 165, 233, 0.25)', // sky
    'rgba(168, 85, 247, 0.25)', // violet
];

export const QueensGame: React.FC<QueensGameProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'daily' | 'practice'>('daily');
    const [dailySeed, setDailySeed] = useState(() => DailySeedEngine.getDailySeed('vibe-queens'));
    const [puzzle, setPuzzle] = useState<QueensPuzzle>(() => QueensEngine.generatePuzzle(6, dailySeed));
    const [board, setBoard] = useState<QueensCellState[][]>(() =>
        Array.from({ length: 6 }, () => Array(6).fill('empty'))
    );
    const [moveCount, setMoveCount] = useState(0);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [bestTime, setBestTime] = useState<number>(0);
    const [isMuted, setIsMuted] = useState(true);
    const [tool, setTool] = useState<'crown' | 'x'>('crown');

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    // Load best time
    useEffect(() => {
        getHighScore('vibe-queens', 'normal', mode, mode === 'daily' ? dailySeed : undefined).then(setBestTime);
    }, [mode, dailySeed]);

    // Timer loop
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const conflicts = useMemo(() => {
        return QueensEngine.findConflicts(board, puzzle.regions);
    }, [board, puzzle.regions]);

    const crownsPlaced = useMemo(() => {
        let count = 0;
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c] === 'crown') count++;
            }
        }
        return count;
    }, [board]);

    const resetGame = useCallback((newMode?: 'daily' | 'practice') => {
        const nextMode = newMode || mode;
        const seed = nextMode === 'daily'
            ? DailySeedEngine.getDailySeed('vibe-queens')
            : `practice_${Date.now()}`;
        setDailySeed(seed);
        const pz = QueensEngine.generatePuzzle(6, seed);
        setPuzzle(pz);
        setBoard(Array.from({ length: 6 }, () => Array(6).fill('empty')));
        setMoveCount(0);
        setTimerSeconds(0);
        setGameState('playing');
    }, [mode, setGameState]);

    useEffect(() => {
        resetGame(mode);
    }, []);

    const handleCellClick = (r: number, c: number) => {
        if (gameState !== 'playing') return;

        setBoard((prev) => {
            const next = prev.map((row) => [...row]);
            const current = next[r][c];

            if (tool === 'crown') {
                if (current === 'crown') {
                    next[r][c] = 'empty';
                } else {
                    next[r][c] = 'crown';
                    arcadeAudio.playCollect();
                }
            } else {
                if (current === 'x') {
                    next[r][c] = 'empty';
                } else {
                    next[r][c] = 'x';
                    arcadeAudio.playJump();
                }
            }

            // Check win condition
            if (QueensEngine.isSolved(next, puzzle.regions)) {
                handleWin(timerSeconds, moveCount + 1);
            }

            return next;
        });

        setMoveCount((m) => m + 1);
    };

    const handleWin = async (timeSec: number, moves: number) => {
        setGameState('completed');
        arcadeAudio.playMilestone();

        const timeMs = timeSec * 1000;
        const display = `${Math.floor(timeSec / 60)}:${String(timeSec % 60).padStart(2, '0')}`;

        await ArcadeLeaderboardService.submitScore({
            gameId: 'vibe-queens',
            metricType: 'time_ms',
            score: timeMs,
            displayValue: display,
            difficulty: 'normal',
            mode,
            dailySeed: mode === 'daily' ? dailySeed : undefined,
        });

        const updatedBest = await getHighScore('vibe-queens', 'normal', mode, mode === 'daily' ? dailySeed : undefined);
        setBestTime(updatedBest);
    };

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title="Queens"
            modeBadge={mode === 'daily' ? 'Daily' : 'Practice'}
            scoreDisplay={formatTime(timerSeconds)}
            highScoreDisplay={bestTime > 0 ? formatTime(Math.floor(bestTime / 1000)) : undefined}
            isMuted={isMuted}
            onToggleMute={() => {
                const next = !isMuted;
                setIsMuted(next);
                arcadeAudio.setEnabled(!next);
            }}
            onPause={pauseGame}
            showExitModal={showExitConfirm}
            onResume={resumeGame}
            onRestart={() => resetGame()}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full flex flex-col items-center justify-center space-y-3 p-2">
                {/* HUD Controls */}
                <div className="w-full flex items-center justify-between text-xs px-2">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => {
                                setMode('daily');
                                resetGame('daily');
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                mode === 'daily' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => {
                                setMode('practice');
                                resetGame('practice');
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                mode === 'practice' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Practice
                        </button>
                    </div>

                    <div className="text-gray-400 font-mono">
                        Queens: <span className="text-white font-bold">{crownsPlaced}/6</span>
                    </div>

                    {/* Tool toggle */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setTool('crown')}
                            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                tool === 'crown' ? 'bg-amber-400 text-black' : 'text-gray-400'
                            }`}
                            aria-label="Crown tool"
                        >
                            👑
                        </button>
                        <button
                            onClick={() => setTool('x')}
                            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                tool === 'x' ? 'bg-red-500 text-white' : 'text-gray-400'
                            }`}
                            aria-label="X tool"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 6x6 Grid */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-black/40 w-full max-w-[min(90vw,360px)] aspect-square grid grid-cols-6 grid-rows-6">
                    {board.map((row, r) =>
                        row.map((cell, c) => {
                            const regionId = puzzle.regions[r][c];
                            const isConflict = conflicts.has(`${r},${c}`);
                            const bgColor = REGION_COLORS[regionId % REGION_COLORS.length];

                            // Borders between different regions
                            const borderTop = r > 0 && puzzle.regions[r - 1][c] !== regionId ? 'border-t-2 border-t-white/40' : 'border-t border-t-white/5';
                            const borderLeft = c > 0 && puzzle.regions[r][c - 1] !== regionId ? 'border-l-2 border-l-white/40' : 'border-l border-l-white/5';

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    style={{ backgroundColor: bgColor }}
                                    className={`relative flex items-center justify-center text-xl sm:text-2xl font-black transition-all active:scale-95 cursor-pointer ${borderTop} ${borderLeft} ${
                                        isConflict ? 'animate-pulse bg-red-600/40!' : ''
                                    }`}
                                >
                                    {cell === 'crown' && (
                                        <span className={`drop-shadow-md ${isConflict ? 'text-red-400' : 'text-amber-400'}`}>
                                            👑
                                        </span>
                                    )}
                                    {cell === 'x' && (
                                        <span className="text-gray-500 font-mono text-base">✕</span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Bottom Status / Instructions */}
                <p className="text-[11px] text-gray-400 text-center max-w-xs">
                    Place 1 Queen per row, column, and colored region without any two touching.
                </p>

                {/* Victory Modal Overlay */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Territory Conquered!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            All Queens peacefully placed with zero conflicts.
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-2 w-56 space-y-1.5">
                            <p className="text-xs text-gray-400 flex justify-between">
                                Time: <span className="text-white font-mono font-bold">{formatTime(timerSeconds)}</span>
                            </p>
                            <p className="text-xs text-gray-400 flex justify-between">
                                Moves: <span className="text-white font-mono font-bold">{moveCount}</span>
                            </p>
                            {bestTime > 0 && (
                                <p className="text-xs text-amber-400 flex justify-between pt-1 border-t border-white/10">
                                    Personal Best: <span className="font-mono font-bold">{formatTime(Math.floor(bestTime / 1000))}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => resetGame()}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Play Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
