import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    SoundSweeperEngine,
    SweeperDifficulty,
    SWEEPER_CONFIGS,
    CellState,
} from './soundSweeperEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoFlag, IoSparkles } from 'react-icons/io5';

interface SoundSweeperProps {
    theme: GameTheme;
    onBack: () => void;
}

const NUMBER_COLORS: Record<number, string> = {
    1: 'text-blue-400',
    2: 'text-emerald-400',
    3: 'text-red-400',
    4: 'text-purple-400',
    5: 'text-amber-400',
    6: 'text-cyan-400',
    7: 'text-pink-400',
    8: 'text-white',
};

export const SoundSweeperGame: React.FC<SoundSweeperProps> = ({ theme, onBack }) => {
    const [difficulty, setDifficulty] = useState<SweeperDifficulty>('beginner');
    const config = SWEEPER_CONFIGS[difficulty];

    const [board, setBoard] = useState<CellState[][]>(() => SoundSweeperEngine.createBoard(config));
    const [firstClickDone, setFirstClickDone] = useState(false);
    const [flagMode, setFlagMode] = useState(false);
    const [flagsPlaced, setFlagsPlaced] = useState(0);
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
        getHighScore('sound-sweeper', difficulty).then(setBestTime);
    }, [difficulty]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const resetGame = useCallback((diff: SweeperDifficulty = difficulty) => {
        const conf = SWEEPER_CONFIGS[diff];
        setBoard(SoundSweeperEngine.createBoard(conf));
        setFirstClickDone(false);
        setFlagsPlaced(0);
        setTimerSeconds(0);
        setGameState('playing');
    }, [difficulty, setGameState]);

    useEffect(() => {
        resetGame(difficulty);
    }, []);

    const handleCellClick = (r: number, c: number) => {
        if (gameState !== 'playing') return;

        // If in flag mode, toggle flag
        if (flagMode) {
            handleToggleFlag(r, c);
            return;
        }

        let currentBoard = board;

        // Ensure safe first click (mines placed only AFTER first click)
        if (!firstClickDone) {
            currentBoard = SoundSweeperEngine.placeMinesSafely(board, config, r, c);
            setFirstClickDone(true);
        }

        const { nextBoard, hitMine } = SoundSweeperEngine.revealCell(currentBoard, r, c);
        setBoard(nextBoard);

        if (hitMine) {
            setGameState('gameover');
            arcadeAudio.playCollision();
            // Reveal all mines
            setBoard((b) =>
                b.map((row) =>
                    row.map((cell) => (cell.isMine ? { ...cell, isRevealed: true } : cell))
                )
            );
        } else {
            arcadeAudio.playJump();

            if (SoundSweeperEngine.checkWin(nextBoard)) {
                handleWin(timerSeconds);
            }
        }
    };

    const handleToggleFlag = (r: number, c: number, e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (gameState !== 'playing') return;

        setBoard((prev) => {
            const next = prev.map((row) => row.map((cell) => ({ ...cell })));
            const cell = next[r][c];
            if (!cell.isRevealed) {
                cell.isFlagged = !cell.isFlagged;
                setFlagsPlaced((count) => count + (cell.isFlagged ? 1 : -1));
                arcadeAudio.playCollect();
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
            gameId: 'sound-sweeper',
            metricType: 'time_ms',
            score: timeMs,
            displayValue: display,
            difficulty,
        });

        const updated = await getHighScore('sound-sweeper', difficulty);
        setBestTime(updated);
    };

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title="Sound Sweeper"
            modeBadge={difficulty.toUpperCase()}
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
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-3 p-1">
                {/* HUD: Difficulty & Flag Mode Toggle */}
                <div className="w-full flex items-center justify-between text-xs px-2">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
                        {(['beginner', 'intermediate'] as SweeperDifficulty[]).map((d) => (
                            <button
                                key={d}
                                onClick={() => {
                                    setDifficulty(d);
                                    resetGame(d);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all ${
                                    difficulty === d ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-400">
                            🚩 {config.mines - flagsPlaced}
                        </span>

                        <button
                            onClick={() => setFlagMode((f) => !f)}
                            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all ${
                                flagMode
                                    ? 'bg-amber-400 text-black border-amber-400'
                                    : 'bg-white/10 text-white border-white/15'
                            }`}
                        >
                            <IoFlag size={14} /> Flag Mode
                        </button>
                    </div>
                </div>

                {/* Sweeper Grid */}
                <div
                    className="relative border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-black/60 p-1.5 grid gap-1 w-full max-w-[min(90vw,340px)] aspect-square"
                    style={{
                        gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
                    }}
                >
                    {board.map((row) =>
                        row.map((cell) => {
                            const isRevealed = cell.isRevealed;
                            const isMine = cell.isMine;
                            const isFlagged = cell.isFlagged;
                            const count = cell.adjacentMines;

                            let bgClass = 'bg-white/15 border border-white/10 hover:bg-white/25 active:scale-95';
                            if (isRevealed) {
                                bgClass = isMine ? 'bg-red-600 border border-red-500' : 'bg-black/50 border border-white/5';
                            }

                            return (
                                <button
                                    key={`${cell.r}-${cell.c}`}
                                    onClick={() => handleCellClick(cell.r, cell.c)}
                                    onContextMenu={(e) => handleToggleFlag(cell.r, cell.c, e)}
                                    className={`rounded-lg flex items-center justify-center font-black font-mono select-none text-xs sm:text-sm transition-all cursor-pointer ${bgClass}`}
                                >
                                    {isFlagged ? (
                                        <span className="text-amber-400">🚩</span>
                                    ) : isRevealed ? (
                                        isMine ? (
                                            '💥'
                                        ) : count > 0 ? (
                                            <span className={NUMBER_COLORS[count] || 'text-white'}>{count}</span>
                                        ) : null
                                    ) : null}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Game Over / Win Overlay */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <span className="text-4xl mb-2">💥</span>
                        <h3 className="text-2xl font-black text-red-500 uppercase tracking-wider mb-1">
                            Audio Feedback Screech!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">You triggered a feedback trap.</p>
                        <button
                            onClick={() => resetGame()}
                            className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <IoRefresh size={16} /> Try Again
                        </button>
                    </div>
                )}

                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Stage Cleared!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">Time: {formatTime(timerSeconds)}</p>
                        <button
                            onClick={() => resetGame()}
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
