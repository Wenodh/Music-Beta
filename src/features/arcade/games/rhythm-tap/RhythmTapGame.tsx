import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { RhythmTapEngine, RhythmNote, HitRating } from './rhythmTapEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface RhythmTapProps {
    theme: GameTheme;
    onBack: () => void;
}

const LANES = [0, 1, 2, 3] as const;
const LANE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
const LANE_KEYS = ['D', 'F', 'J', 'K'];

export const RhythmTapGame: React.FC<RhythmTapProps> = ({ theme, onBack }) => {
    const [notes, setNotes] = useState<RhythmNote[]>([]);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [feedback, setFeedback] = useState<HitRating | null>(null);
    const [highScore, setHighScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const noteIdRef = useRef(1);
    const notesRef = useRef(notes);
    notesRef.current = notes;
    const animFrameRef = useRef<number | null>(null);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack, initialState: 'playing' });

    useEffect(() => {
        getHighScore('rhythm-tap', 'normal').then(setHighScore);
    }, []);

    const resetGame = useCallback(() => {
        setNotes([]);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setFeedback(null);
        setGameState('playing');
    }, [setGameState]);

    const handleHitLane = useCallback((lane: 0 | 1 | 2 | 3) => {
        if (gameState !== 'playing') return;

        // Find closest note in this lane near target line (y = 85)
        const laneNotes = notesRef.current.filter((n) => n.lane === lane && !n.hit && !n.missed);
        if (laneNotes.length === 0) return;

        // Sort by distance to 85
        laneNotes.sort((a, b) => Math.abs(a.y - 85) - Math.abs(b.y - 85));
        const target = laneNotes[0];

        const res = RhythmTapEngine.evaluateHit(target.y, 85, 18);
        if (res) {
            target.hit = true;
            arcadeAudio.playNote(220 + lane * 110);
            setFeedback(res.rating);
            setCombo((c) => {
                const next = c + 1;
                setMaxCombo((m) => Math.max(m, next));
                return next;
            });
            setScore((s) => s + res.points * Math.max(1, Math.floor(combo / 10) + 1));
        } else {
            arcadeAudio.playCollision();
            setFeedback('MISS');
            setCombo(0);
        }
    }, [gameState, combo]);

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase();
            const idx = LANE_KEYS.indexOf(key);
            if (idx !== -1) {
                handleHitLane(idx as 0 | 1 | 2 | 3);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleHitLane]);

    // Spawn loop
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            const newNote = RhythmTapEngine.spawnNote(noteIdRef.current++);
            setNotes((prev) => [...prev, newNote]);
        }, 550);
        return () => clearInterval(interval);
    }, [gameState]);

    // Main animation loop
    useEffect(() => {
        if (gameState !== 'playing') {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            return;
        }

        let totalMisses = 0;

        const loop = () => {
            const { updatedNotes, newlyMissed } = RhythmTapEngine.updateNotes(notesRef.current, 0.85, 85, 15);
            notesRef.current = updatedNotes;
            setNotes([...updatedNotes]);

            if (newlyMissed > 0) {
                arcadeAudio.playCollision();
                setFeedback('MISS');
                setCombo(0);
                totalMisses += newlyMissed;

                if (totalMisses >= 10) {
                    setGameState('completed');
                    ArcadeLeaderboardService.submitScore({
                        gameId: 'rhythm-tap',
                        metricType: 'points',
                        score,
                        displayValue: `${score.toLocaleString()} pts`,
                        difficulty: 'normal',
                    });
                    getHighScore('rhythm-tap', 'normal').then(setHighScore);
                }
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [gameState, score, setGameState]);

    return (
        <ArcadeGameShell
            title="Rhythm Tap"
            modeBadge={`COMBO ${combo}`}
            scoreDisplay={`Score: ${score.toLocaleString()}`}
            highScoreDisplay={highScore > 0 ? `Best: ${highScore.toLocaleString()}` : undefined}
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
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-3 p-1">
                {/* Visual Lane Stage */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden bg-black/90 shadow-2xl w-full aspect-[400/520] flex flex-col">
                    {/* Target Hit Line */}
                    <div className="absolute top-[85%] left-0 right-0 h-1 bg-white/40 shadow-[0_0_12px_#ffffff] z-10 pointer-events-none" />

                    {/* Feedback Toast */}
                    {feedback && (
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none animate-pulse">
                            <span
                                className={`text-2xl font-black italic tracking-widest ${
                                    feedback === 'PERFECT'
                                        ? 'text-cyan-300 drop-shadow-[0_0_8px_#06b6d4]'
                                        : feedback === 'GREAT'
                                        ? 'text-emerald-300 drop-shadow-[0_0_8px_#10b981]'
                                        : feedback === 'GOOD'
                                        ? 'text-amber-300'
                                        : 'text-red-500'
                                }`}
                            >
                                {feedback}
                            </span>
                        </div>
                    )}

                    {/* Lanes */}
                    <div className="flex-1 grid grid-cols-4 relative">
                        {LANES.map((lane) => (
                            <div
                                key={lane}
                                className="relative border-r border-white/10 last:border-r-0 flex flex-col justify-end"
                            >
                                {/* Active Notes in this Lane */}
                                {notes
                                    .filter((n) => n.lane === lane && !n.hit)
                                    .map((n) => (
                                        <div
                                            key={n.id}
                                            className="absolute left-2 right-2 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-lg transition-transform"
                                            style={{
                                                top: `${n.y}%`,
                                                backgroundColor: LANE_COLORS[lane],
                                                boxShadow: `0 0 10px ${LANE_COLORS[lane]}`,
                                            }}
                                        >
                                            🎵
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>

                    {/* Bottom Hit Triggers */}
                    <div className="h-16 grid grid-cols-4 gap-1 p-1 bg-black/60 z-20">
                        {LANES.map((lane) => (
                            <button
                                key={lane}
                                onClick={() => handleHitLane(lane)}
                                className="h-full rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all text-white font-black text-sm cursor-pointer"
                                style={{
                                    backgroundColor: `${LANE_COLORS[lane]}40`,
                                    border: `1px solid ${LANE_COLORS[lane]}`,
                                }}
                            >
                                <span>{LANE_KEYS[lane]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Game Over Modal */}
                    {gameState === 'completed' && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                            <div className="w-16 h-16 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mb-3 animate-bounce">
                                <IoTrophy size={36} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                                Track Complete!
                            </h3>
                            <p className="text-xs text-gray-300 mb-1">
                                Final Score: {score.toLocaleString()} pts
                            </p>
                            <p className="text-xs text-cyan-400 mb-4">Max Combo: {maxCombo}</p>
                            <button
                                onClick={resetGame}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Play Track Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ArcadeGameShell>
    );
};
