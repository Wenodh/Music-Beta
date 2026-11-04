import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { PicrossEngine, PICROSS_PRESETS, PicrossPuzzle } from './picrossEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoBrushOutline, IoClose } from 'react-icons/io5';

interface PicrossGameProps {
    theme: GameTheme;
    onBack: () => void;
}

export const PicrossGame: React.FC<PicrossGameProps> = ({ theme, onBack }) => {
    const [presetIndex, setPresetIndex] = useState(0);
    const puzzle = PicrossEngine.createPuzzleFromPreset(PICROSS_PRESETS[presetIndex]);
    const size = puzzle.size;

    const [userGrid, setUserGrid] = useState<(boolean | null)[][]>(() =>
        Array.from({ length: size }, () => Array(size).fill(null))
    );
    const [tool, setTool] = useState<'fill' | 'cross'>('fill');
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
        getHighScore('picross-music', puzzle.id).then(setBestTime);
    }, [puzzle.id]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const resetGame = useCallback((idx: number = presetIndex) => {
        const pz = PicrossEngine.createPuzzleFromPreset(PICROSS_PRESETS[idx]);
        setUserGrid(Array.from({ length: pz.size }, () => Array(pz.size).fill(null)));
        setTimerSeconds(0);
        setGameState('playing');
    }, [presetIndex, setGameState]);

    useEffect(() => {
        resetGame(presetIndex);
    }, []);

    const handleCellClick = (r: number, c: number) => {
        if (gameState !== 'playing') return;

        setUserGrid((prev) => {
            const next = prev.map((row) => [...row]);
            const current = next[r][c];

            if (tool === 'fill') {
                next[r][c] = current === true ? null : true;
                arcadeAudio.playCollect();
            } else {
                next[r][c] = current === false ? null : false;
                arcadeAudio.playJump();
            }

            if (PicrossEngine.isSolved(next, puzzle.solution)) {
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
            gameId: 'picross-music',
            metricType: 'time_ms',
            score: timeMs,
            displayValue: display,
            difficulty: puzzle.id,
        });

        const updated = await getHighScore('picross-music', puzzle.id);
        setBestTime(updated);
    };

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title={`Picross: ${puzzle.title}`}
            modeBadge={`${size}x${size}`}
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
                {/* Puzzle Selector & Tool Toggle */}
                <div className="w-full flex items-center justify-between text-xs px-2">
                    <select
                        value={presetIndex}
                        onChange={(e) => {
                            const idx = parseInt(e.target.value, 10);
                            setPresetIndex(idx);
                            resetGame(idx);
                        }}
                        className="bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                    >
                        {PICROSS_PRESETS.map((p, idx) => (
                            <option key={p.id} value={idx} className="bg-gray-900 text-white">
                                {p.title} ({p.size}x{p.size})
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setTool('fill')}
                            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                tool === 'fill' ? 'bg-primary text-white' : 'text-gray-400'
                            }`}
                        >
                            <IoBrushOutline size={14} /> Fill
                        </button>
                        <button
                            onClick={() => setTool('cross')}
                            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                tool === 'cross' ? 'bg-red-500 text-white' : 'text-gray-400'
                            }`}
                        >
                            <IoClose size={15} /> X
                        </button>
                    </div>
                </div>

                {/* Nonogram Board with Clues */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-black/70 p-2 flex flex-col">
                    {/* Top Column Clues */}
                    <div className="flex pl-10 mb-1">
                        {puzzle.colClues.map((clue, c) => (
                            <div key={c} className="flex-1 flex flex-col items-center justify-end text-[10px] font-mono font-bold text-gray-300 space-y-0.5">
                                {clue.map((n, idx) => (
                                    <span key={idx}>{n}</span>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Row Clues + Grid */}
                    {userGrid.map((row, r) => (
                        <div key={r} className="flex items-center">
                            {/* Left Row Clues */}
                            <div className="w-10 pr-2 flex justify-end gap-1 text-[10px] font-mono font-bold text-gray-300">
                                {puzzle.rowClues[r].map((n, idx) => (
                                    <span key={idx}>{n}</span>
                                ))}
                            </div>

                            {/* Cells */}
                            <div className="flex-1 flex gap-1 py-0.5">
                                {row.map((cell, c) => (
                                    <button
                                        key={c}
                                        onClick={() => handleCellClick(r, c)}
                                        className={`flex-1 aspect-square rounded border transition-all active:scale-95 flex items-center justify-center font-bold text-xs ${
                                            cell === true
                                                ? 'bg-primary border-primary text-white'
                                                : cell === false
                                                ? 'bg-white/5 border-white/10 text-gray-500'
                                                : 'bg-white/10 border-white/10 hover:bg-white/20'
                                        }`}
                                    >
                                        {cell === false && '✕'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Win Overlay */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Masterpiece Painted!
                        </h3>
                        <p className="text-sm font-bold text-primary mb-4">{puzzle.title}</p>
                        <p className="text-xs text-gray-300 mb-4">Completed in {formatTime(timerSeconds)}</p>
                        <button
                            onClick={() => {
                                const next = (presetIndex + 1) % PICROSS_PRESETS.length;
                                setPresetIndex(next);
                                resetGame(next);
                            }}
                            className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <IoRefresh size={16} /> Next Art
                        </button>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
