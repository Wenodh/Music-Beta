import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { PinpointEngine, PinpointPuzzle } from './pinpointEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoEyeOutline, IoSend, IoCloseCircle } from 'react-icons/io5';

interface PinpointGameProps {
    theme: GameTheme;
    onBack: () => void;
}

export const PinpointGame: React.FC<PinpointGameProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'daily' | 'practice'>('daily');
    const [dailySeed, setDailySeed] = useState(() => DailySeedEngine.getDailySeed('music-pinpoint'));
    const [puzzle, setPuzzle] = useState<PinpointPuzzle>(() => PinpointEngine.getDailyPuzzle(dailySeed));
    const [revealedCount, setRevealedCount] = useState<number>(1);
    const [guessInput, setGuessInput] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isWrong, setIsWrong] = useState(false);
    const [score, setScore] = useState<number>(0);
    const [bestScore, setBestScore] = useState<number>(0);
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
        getHighScore('music-pinpoint', 'normal', mode, mode === 'daily' ? dailySeed : undefined).then(setBestScore);
    }, [mode, dailySeed]);

    const resetGame = useCallback((newMode?: 'daily' | 'practice') => {
        const nextMode = newMode || mode;
        const seed = nextMode === 'daily'
            ? DailySeedEngine.getDailySeed('music-pinpoint')
            : `practice_${Date.now()}`;
        setDailySeed(seed);
        const pz = nextMode === 'daily'
            ? PinpointEngine.getDailyPuzzle(seed)
            : PinpointEngine.getPracticePuzzle();
        setPuzzle(pz);
        setRevealedCount(1);
        setGuessInput('');
        setStatusMessage(null);
        setIsWrong(false);
        setScore(0);
        setGameState('playing');
    }, [mode, setGameState]);

    useEffect(() => {
        resetGame(mode);
    }, []);

    const handleRevealNextClue = () => {
        if (revealedCount < 5) {
            setRevealedCount((c) => c + 1);
            arcadeAudio.playJump();
        }
    };

    const handleGuessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guessInput.trim() || gameState !== 'playing') return;

        const isMatch = PinpointEngine.checkGuess(guessInput, puzzle);
        if (isMatch) {
            const finalScore = PinpointEngine.calculateScore(revealedCount);
            setScore(finalScore);
            setGameState('completed');
            arcadeAudio.playMilestone();

            await ArcadeLeaderboardService.submitScore({
                gameId: 'music-pinpoint',
                metricType: 'points',
                score: finalScore,
                displayValue: `${finalScore.toLocaleString()} pts`,
                difficulty: 'normal',
                mode,
                dailySeed: mode === 'daily' ? dailySeed : undefined,
            });

            const updatedBest = await getHighScore('music-pinpoint', 'normal', mode, mode === 'daily' ? dailySeed : undefined);
            setBestScore(updatedBest);
        } else {
            setIsWrong(true);
            setStatusMessage('Not quite! Reveal another clue or try again.');
            arcadeAudio.playCollision();
            setTimeout(() => setIsWrong(false), 800);
            if (revealedCount < 5) {
                setRevealedCount((c) => c + 1);
            }
        }
    };

    return (
        <ArcadeGameShell
            title="Music Pinpoint"
            modeBadge={mode === 'daily' ? 'Daily' : 'Practice'}
            scoreDisplay={score > 0 ? `${score.toLocaleString()} pts` : undefined}
            highScoreDisplay={bestScore > 0 ? `${bestScore.toLocaleString()} pts` : undefined}
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
            <div className="w-full max-w-md flex flex-col items-center justify-center space-y-4 p-3">
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

                    <div className="text-[11px] font-bold text-amber-400">
                        Reward: {PinpointEngine.calculateScore(revealedCount).toLocaleString()} pts
                    </div>
                </div>

                {/* 5 Clue Cards Stack */}
                <div className="w-full space-y-2">
                    {puzzle.clues.map((clue, idx) => {
                        const isRevealed = idx < revealedCount;
                        return (
                            <div
                                key={idx}
                                className={`w-full p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                                    isRevealed
                                        ? 'bg-white/10 border-white/20 text-white shadow-md'
                                        : 'bg-white/5 border-white/5 text-gray-500'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono font-bold">
                                        {idx + 1}
                                    </span>
                                    <span className="font-semibold text-sm">
                                        {isRevealed ? clue : '••••••••••••••••'}
                                    </span>
                                </div>
                                {isRevealed && (
                                    <span className="text-[10px] uppercase font-bold text-primary">Revealed</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Clue Reveal Button if < 5 */}
                {revealedCount < 5 && gameState === 'playing' && (
                    <button
                        onClick={handleRevealNextClue}
                        className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 py-1.5 px-3 bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer"
                    >
                        <IoEyeOutline size={15} /> Reveal Clue {revealedCount + 1} (-1,000 pts)
                    </button>
                )}

                {/* Guess Form */}
                {gameState === 'playing' && (
                    <form onSubmit={handleGuessSubmit} className="w-full space-y-2">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={guessInput}
                                onChange={(e) => setGuessInput(e.target.value)}
                                placeholder="What category links all clues?"
                                className={`w-full px-4 py-3 rounded-2xl bg-white/10 border text-white text-sm focus:outline-none focus:border-primary transition-all pr-12 ${
                                    isWrong ? 'border-red-500 animate-shake' : 'border-white/15'
                                }`}
                            />
                            <button
                                type="submit"
                                className="absolute right-2 p-2 bg-primary hover:bg-red-600 text-white rounded-xl active:scale-95 transition-all cursor-pointer"
                                aria-label="Submit Guess"
                            >
                                <IoSend size={16} />
                            </button>
                        </div>
                        {statusMessage && (
                            <p className="text-xs text-amber-400 text-center font-medium animate-fade-in">
                                {statusMessage}
                            </p>
                        )}
                    </form>
                )}

                {/* Victory Modal */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Mystery Solved!
                        </h3>
                        <p className="text-sm text-primary font-bold mb-4">
                            "{puzzle.category}"
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-2 w-56 space-y-1.5">
                            <p className="text-xs text-gray-400 flex justify-between">
                                Clues Used: <span className="text-white font-mono font-bold">{revealedCount}/5</span>
                            </p>
                            <p className="text-xs text-gray-400 flex justify-between">
                                Score: <span className="text-emerald-400 font-mono font-bold">{score.toLocaleString()} pts</span>
                            </p>
                            {bestScore > 0 && (
                                <p className="text-xs text-amber-400 flex justify-between pt-1 border-t border-white/10">
                                    Personal Best: <span className="font-mono font-bold">{bestScore.toLocaleString()} pts</span>
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => resetGame()}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Next Puzzle
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
