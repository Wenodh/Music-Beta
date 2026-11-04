import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { TangoEngine, TangoSymbol, TangoPuzzle } from './tangoEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle } from 'react-icons/io5';

interface TangoGameProps {
    theme: GameTheme;
    onBack: () => void;
}

export const TangoGame: React.FC<TangoGameProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'daily' | 'practice'>('daily');
    const [dailySeed, setDailySeed] = useState(() => DailySeedEngine.getDailySeed('beat-tango'));
    const [puzzle, setPuzzle] = useState<TangoPuzzle>(() => TangoEngine.generatePuzzle(dailySeed));
    const [grid, setGrid] = useState<TangoSymbol[][]>(() =>
        puzzle.initialGrid.map((row) => [...row])
    );
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [bestTime, setBestTime] = useState<number>(0);
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
        getHighScore('beat-tango', 'normal', mode, mode === 'daily' ? dailySeed : undefined).then(setBestTime);
    }, [mode, dailySeed]);

    // Timer loop
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const { errors } = useMemo(() => {
        return TangoEngine.validateBoard(grid, puzzle.constraints);
    }, [grid, puzzle.constraints]);

    const resetGame = useCallback((newMode?: 'daily' | 'practice') => {
        const nextMode = newMode || mode;
        const seed = nextMode === 'daily'
            ? DailySeedEngine.getDailySeed('beat-tango')
            : `practice_${Date.now()}`;
        setDailySeed(seed);
        const pz = TangoEngine.generatePuzzle(seed);
        setPuzzle(pz);
        setGrid(pz.initialGrid.map((row) => [...row]));
        setTimerSeconds(0);
        setGameState('playing');
    }, [mode, setGameState]);

    useEffect(() => {
        resetGame(mode);
    }, []);

    const handleCellClick = (r: number, c: number) => {
        if (gameState !== 'playing') return;
        // Cannot modify pre-placed initial cells
        if (puzzle.initialGrid[r][c] !== null) return;

        setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            const current = next[r][c];

            // Cycle: empty -> sun -> moon -> empty
            if (current === null) {
                next[r][c] = 'sun';
                arcadeAudio.playCollect();
            } else if (current === 'sun') {
                next[r][c] = 'moon';
                arcadeAudio.playJump();
            } else {
                next[r][c] = null;
            }

            // Check if solved
            if (TangoEngine.isSolved(next, puzzle.constraints)) {
                handleWin(timerSeconds);
            }

            return next;
        });
    };

    const handleWin = async (timeSec: number) => {
        setGameState('completed');
        arcadeAudio.playMilestone();

        const timeMs = timeSec * 1000;
        const display = `${Math.floor(timeSec / 60)}:${String(timeSec % 60).padStart(2, '0')}`;

        await ArcadeLeaderboardService.submitScore({
            gameId: 'beat-tango',
            metricType: 'time_ms',
            score: timeMs,
            displayValue: display,
            difficulty: 'normal',
            mode,
            dailySeed: mode === 'daily' ? dailySeed : undefined,
        });

        const updatedBest = await getHighScore('beat-tango', 'normal', mode, mode === 'daily' ? dailySeed : undefined);
        setBestTime(updatedBest);
    };

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title="Beat Tango"
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
                {/* Mode Toggles */}
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

                    <div className="text-[11px] text-gray-400">
                        Tap cell to toggle: <span className="text-amber-400">☀️</span> / <span className="text-cyan-400">🌙</span>
                    </div>
                </div>

                {/* 6x6 Grid with Constraints */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-black/60 w-full max-w-[min(90vw,360px)] aspect-square p-2 flex flex-col justify-between">
                    {grid.map((row, r) => (
                        <div key={r} className="flex-1 flex flex-col">
                            <div className="flex-1 flex items-center justify-between">
                                {row.map((cell, c) => {
                                    const isLocked = puzzle.initialGrid[r][c] !== null;
                                    const isErr = errors.has(`${r},${c}`);
                                    const hCon = c < 5 ? puzzle.constraints.horizontal[r][c] : null;

                                    return (
                                        <React.Fragment key={`${r}-${c}`}>
                                            <button
                                                onClick={() => handleCellClick(r, c)}
                                                className={`flex-1 h-full rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold transition-all active:scale-95 border ${
                                                    isLocked
                                                        ? 'bg-white/15 border-white/20'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                } ${isErr ? 'bg-red-500/30! border-red-500!' : ''}`}
                                            >
                                                {cell === 'sun' && <span>☀️</span>}
                                                {cell === 'moon' && <span>🌙</span>}
                                            </button>

                                            {/* Horizontal constraint badge between cells */}
                                            {c < 5 && (
                                                <div className="w-3 text-center text-[10px] font-mono text-gray-400 select-none">
                                                    {hCon === '=' && <span className="text-emerald-400 font-bold">=</span>}
                                                    {hCon === 'x' && <span className="text-red-400 font-bold">×</span>}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Vertical constraint row */}
                            {r < 5 && (
                                <div className="h-3 flex items-center justify-between px-2">
                                    {row.map((_, c) => {
                                        const vCon = puzzle.constraints.vertical[r][c];
                                        return (
                                            <div key={`v-${r}-${c}`} className="flex-1 text-center text-[10px] font-mono text-gray-400 select-none">
                                                {vCon === '=' && <span className="text-emerald-400 font-bold">=</span>}
                                                {vCon === 'x' && <span className="text-red-400 font-bold">×</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-[11px] text-gray-400 text-center max-w-xs">
                    No 3 identical symbols in a row/col. Equal suns & moons. Satisfy = and × rules.
                </p>

                {/* Victory Modal Overlay */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Harmony Restored!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            All suns, moons, and beat constraints are perfectly balanced.
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-2 w-56 space-y-1.5">
                            <p className="text-xs text-gray-400 flex justify-between">
                                Time: <span className="text-white font-mono font-bold">{formatTime(timerSeconds)}</span>
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
