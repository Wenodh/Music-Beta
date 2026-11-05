import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { SimonBeatsEngine, PadColor, PADS } from './simonBeatsEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface SimonBeatsProps {
    theme: GameTheme;
    onBack: () => void;
}

export const SimonBeatsGame: React.FC<SimonBeatsProps> = ({ theme, onBack }) => {
    const [sequence, setSequence] = useState<PadColor[]>([]);
    const [playerIndex, setPlayerIndex] = useState(0);
    const [activePad, setActivePad] = useState<PadColor | null>(null);
    const [isShowingSequence, setIsShowingSequence] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    const sequenceRef = useRef(sequence);
    sequenceRef.current = sequence;

    useEffect(() => {
        getHighScore('simon-beats', 'normal').then(setHighScore);
    }, []);

    const playPadTone = (color: PadColor) => {
        const pad = PADS.find((p) => p.color === color);
        if (pad) {
            arcadeAudio.playNote(pad.freq, 0.25);
        }
    };

    const flashPad = (color: PadColor, duration = 300) => {
        setActivePad(color);
        playPadTone(color);
        setTimeout(() => {
            setActivePad(null);
        }, duration);
    };

    const playSequence = useCallback((seq: PadColor[]) => {
        setIsShowingSequence(true);
        let idx = 0;
        const interval = setInterval(() => {
            if (idx >= seq.length) {
                clearInterval(interval);
                setIsShowingSequence(false);
                setPlayerIndex(0);
                return;
            }
            flashPad(seq[idx], 350);
            idx++;
        }, 600);
    }, []);

    const startRound = useCallback((currentSeq: PadColor[]) => {
        const nextSeq = SimonBeatsEngine.generateNextStep(currentSeq);
        setSequence(nextSeq);
        setTimeout(() => {
            playSequence(nextSeq);
        }, 500);
    }, [playSequence]);

    const resetGame = useCallback(() => {
        setScore(0);
        setPlayerIndex(0);
        setGameState('playing');
        startRound([]);
    }, [setGameState, startRound]);

    const handlePadClick = (color: PadColor) => {
        if (gameState !== 'playing' || isShowingSequence) return;

        flashPad(color, 200);

        const isCorrect = SimonBeatsEngine.verifyInput(sequenceRef.current, playerIndex, color);

        if (isCorrect) {
            const nextIdx = playerIndex + 1;
            if (nextIdx >= sequenceRef.current.length) {
                // Round completed!
                arcadeAudio.playMilestone();
                const newScore = sequenceRef.current.length;
                setScore(newScore);
                startRound(sequenceRef.current);
            } else {
                setPlayerIndex(nextIdx);
            }
        } else {
            // Wrong sequence
            arcadeAudio.playCollision();
            setGameState('completed');
            ArcadeLeaderboardService.submitScore({
                gameId: 'simon-beats',
                metricType: 'points',
                score,
                displayValue: `${score} beats`,
                difficulty: 'normal',
            });
            getHighScore('simon-beats', 'normal').then(setHighScore);
        }
    };

    useEffect(() => {
        resetGame();
    }, [resetGame]);

    return (
        <ArcadeGameShell
            title="Simon Beats"
            modeBadge={`BEAT ${sequence.length}`}
            scoreDisplay={`Streak: ${score}`}
            highScoreDisplay={highScore > 0 ? `Best: ${highScore}` : undefined}
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
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-4 p-1">
                {/* Status Header */}
                <div className="w-full flex items-center justify-center py-1">
                    <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                            isShowingSequence
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                    >
                        {isShowingSequence ? 'Listen to the Rhythm...' : 'Your Turn! Repeat Beat'}
                    </span>
                </div>

                {/* Circular Simon Pad Grid */}
                <div className="relative border-4 border-white/20 rounded-full overflow-hidden bg-black/90 shadow-2xl p-4 w-72 h-72 aspect-square flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-3 w-full h-full p-2">
                        {PADS.map((pad) => (
                            <button
                                key={pad.color}
                                disabled={isShowingSequence || gameState !== 'playing'}
                                onClick={() => handlePadClick(pad.color)}
                                className={`rounded-3xl transition-all duration-100 cursor-pointer ${
                                    activePad === pad.color ? pad.activeClass : pad.bgClass
                                } active:scale-95 disabled:cursor-not-allowed`}
                            />
                        ))}
                    </div>

                    {/* Center Core */}
                    <div className="absolute w-24 h-24 rounded-full bg-black/80 border-2 border-white/20 flex flex-col items-center justify-center pointer-events-none shadow-xl">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">STREAK</span>
                        <span className="text-2xl font-black text-white">{score}</span>
                    </div>

                    {/* Game Over Modal */}
                    {gameState === 'completed' && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                            <div className="w-16 h-16 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mb-3 animate-bounce">
                                <IoTrophy size={36} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                                Rhythm Lost!
                            </h3>
                            <p className="text-xs text-gray-300 mb-4">
                                Sequence Length: {score} beats
                            </p>
                            <button
                                onClick={resetGame}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ArcadeGameShell>
    );
};
