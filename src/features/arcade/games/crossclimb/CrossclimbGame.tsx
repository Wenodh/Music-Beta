import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { CrossclimbEngine, CrossclimbPuzzle, CrossclimbRung } from './crossclimbEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoArrowUp, IoArrowDown, IoCheckmark } from 'react-icons/io5';

interface CrossclimbGameProps {
    theme: GameTheme;
    onBack: () => void;
}

export const CrossclimbGame: React.FC<CrossclimbGameProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'daily' | 'practice'>('daily');
    const [dailySeed, setDailySeed] = useState(() => DailySeedEngine.getDailySeed('crossclimb'));
    const [puzzle, setPuzzle] = useState<CrossclimbPuzzle>(() => CrossclimbEngine.getDailyPuzzle(dailySeed));
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [rungOrder, setRungOrder] = useState<CrossclimbRung[]>(() => [...puzzle.rungs]);
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
        getHighScore('crossclimb', 'normal', mode, mode === 'daily' ? dailySeed : undefined).then(setBestTime);
    }, [mode, dailySeed]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const resetGame = useCallback((newMode?: 'daily' | 'practice') => {
        const nextMode = newMode || mode;
        const seed = nextMode === 'daily'
            ? DailySeedEngine.getDailySeed('crossclimb')
            : `practice_${Date.now()}`;
        setDailySeed(seed);
        const pz = nextMode === 'daily'
            ? CrossclimbEngine.getDailyPuzzle(seed)
            : CrossclimbEngine.getPracticePuzzle();
        setPuzzle(pz);
        setRungOrder([...pz.rungs]);
        setUserAnswers({});
        setTimerSeconds(0);
        setGameState('playing');
    }, [mode, setGameState]);

    useEffect(() => {
        resetGame(mode);
    }, []);

    const handleWordInput = (rungId: string, value: string) => {
        const upper = value.toUpperCase().slice(0, 4);
        setUserAnswers((prev) => ({ ...prev, [rungId]: upper }));

        // Check if word matches
        const rung = puzzle.rungs.find((r) => r.id === rungId);
        if (rung && upper === rung.word.toUpperCase()) {
            arcadeAudio.playCollect();
        }
    };

    const moveRung = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= rungOrder.length) return;

        const next = [...rungOrder];
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
        setRungOrder(next);
        arcadeAudio.playJump();

        checkLadderWin(next, userAnswers);
    };

    const checkLadderWin = (order: CrossclimbRung[], answers: Record<string, string>) => {
        // All words must be solved correctly
        for (const r of order) {
            if ((answers[r.id] || '').toUpperCase() !== r.word.toUpperCase()) {
                return;
            }
        }

        // Ladder sequence must be valid
        const isValidLadder = CrossclimbEngine.validateLadder(
            puzzle.topWord,
            puzzle.bottomWord,
            order
        );

        if (isValidLadder) {
            handleWin(timerSeconds);
        }
    };

    const handleWin = async (timeSec: number) => {
        setGameState('completed');
        arcadeAudio.playMilestone();

        const timeMs = timeSec * 1000;
        const display = `${Math.floor(timeSec / 60)}:${String(timeSec % 60).padStart(2, '0')}`;

        await ArcadeLeaderboardService.submitScore({
            gameId: 'crossclimb',
            metricType: 'time_ms',
            score: timeMs,
            displayValue: display,
            difficulty: 'normal',
            mode,
            dailySeed: mode === 'daily' ? dailySeed : undefined,
        });

        const updatedBest = await getHighScore('crossclimb', 'normal', mode, mode === 'daily' ? dailySeed : undefined);
        setBestTime(updatedBest);
    };

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title="Crossclimb"
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
            <div className="w-full max-w-md flex flex-col items-center justify-center space-y-3 p-2">
                {/* Mode Selector */}
                <div className="w-full flex items-center justify-between text-xs px-1">
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
                        Solve clues, then reorder ladder rungs.
                    </div>
                </div>

                {/* Ladder Display */}
                <div className="w-full space-y-2">
                    {/* Top Anchor */}
                    <div className="p-3 bg-primary/20 border-2 border-primary/40 rounded-2xl flex items-center justify-between text-white font-mono font-black text-base shadow-lg">
                        <span className="text-xs font-sans uppercase font-bold text-primary tracking-widest">Start</span>
                        <span className="tracking-widest text-lg">{puzzle.topWord}</span>
                        <span className="text-xs font-sans text-gray-400">⚓ Anchor</span>
                    </div>

                    {/* Middle Rungs */}
                    {rungOrder.map((rung, idx) => {
                        const val = userAnswers[rung.id] || '';
                        const isCorrect = val.toUpperCase() === rung.word.toUpperCase();

                        return (
                            <div
                                key={rung.id}
                                className={`p-3 bg-white/5 border rounded-2xl flex items-center justify-between gap-3 transition-all ${
                                    isCorrect ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10'
                                }`}
                            >
                                <div className="flex-1 space-y-1">
                                    <p className="text-[11px] text-gray-300 font-medium leading-snug">{rung.clue}</p>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={val}
                                        onChange={(e) => handleWordInput(rung.id, e.target.value)}
                                        placeholder="____"
                                        className="w-24 px-2 py-1 bg-black/40 border border-white/20 rounded-lg text-white font-mono font-bold uppercase tracking-widest text-center text-sm focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <button
                                        disabled={idx === 0}
                                        onClick={() => moveRung(idx, 'up')}
                                        className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-lg text-white transition-all cursor-pointer"
                                        aria-label="Move up"
                                    >
                                        <IoArrowUp size={14} />
                                    </button>
                                    <button
                                        disabled={idx === rungOrder.length - 1}
                                        onClick={() => moveRung(idx, 'down')}
                                        className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-lg text-white transition-all cursor-pointer"
                                        aria-label="Move down"
                                    >
                                        <IoArrowDown size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom Anchor */}
                    <div className="p-3 bg-primary/20 border-2 border-primary/40 rounded-2xl flex items-center justify-between text-white font-mono font-black text-base shadow-lg">
                        <span className="text-xs font-sans uppercase font-bold text-primary tracking-widest">Finish</span>
                        <span className="tracking-widest text-lg">{puzzle.bottomWord}</span>
                        <span className="text-xs font-sans text-gray-400">⚓ Anchor</span>
                    </div>
                </div>

                {/* Victory Modal */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Ladder Conquered!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            All words solved and rungs chained by 1-letter shifts.
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
