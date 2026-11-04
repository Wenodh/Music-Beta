import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { WordleEngine, WordleFeedback } from './wordleEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoBackspaceOutline } from 'react-icons/io5';

interface WordleGameProps {
    theme: GameTheme;
    onBack: () => void;
}

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

export const WordleGame: React.FC<WordleGameProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'daily' | 'practice'>('daily');
    const [dailySeed, setDailySeed] = useState(() => DailySeedEngine.getDailySeed('vibe-word'));
    const [targetWord, setTargetWord] = useState(() => WordleEngine.getDailyWord(dailySeed));
    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [bestGuesses, setBestGuesses] = useState<number>(0);
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
        getHighScore('vibe-word', 'normal', mode, mode === 'daily' ? dailySeed : undefined).then(setBestGuesses);
    }, [mode, dailySeed]);

    const resetGame = useCallback((newMode?: 'daily' | 'practice') => {
        const nextMode = newMode || mode;
        const seed = nextMode === 'daily'
            ? DailySeedEngine.getDailySeed('vibe-word')
            : `practice_${Date.now()}`;
        setDailySeed(seed);
        const word = nextMode === 'daily'
            ? WordleEngine.getDailyWord(seed)
            : WordleEngine.getPracticeWord();
        setTargetWord(word);
        setGuesses([]);
        setCurrentGuess('');
        setGameState('playing');
    }, [mode, setGameState]);

    useEffect(() => {
        resetGame(mode);
    }, []);

    const handleKeyPress = (key: string) => {
        if (gameState !== 'playing') return;

        if (key === 'ENTER') {
            if (currentGuess.length === 5) {
                submitGuess();
            }
        } else if (key === 'BACK' || key === 'Backspace') {
            setCurrentGuess((prev) => prev.slice(0, -1));
        } else if (/^[A-Za-z]$/.test(key) && currentGuess.length < 5) {
            setCurrentGuess((prev) => prev + key.toUpperCase());
        }
    };

    const submitGuess = async () => {
        const nextGuesses = [...guesses, currentGuess];
        setGuesses(nextGuesses);
        setCurrentGuess('');
        arcadeAudio.playJump();

        if (currentGuess === targetWord) {
            // Won!
            setGameState('completed');
            arcadeAudio.playMilestone();

            const guessCount = nextGuesses.length;
            await ArcadeLeaderboardService.submitScore({
                gameId: 'vibe-word',
                metricType: 'moves',
                score: guessCount,
                displayValue: `${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}`,
                difficulty: 'normal',
                mode,
                dailySeed: mode === 'daily' ? dailySeed : undefined,
            });

            const updatedBest = await getHighScore('vibe-word', 'normal', mode, mode === 'daily' ? dailySeed : undefined);
            setBestGuesses(updatedBest);
        } else if (nextGuesses.length >= 6) {
            // Game Over
            setGameState('gameover');
            arcadeAudio.playCollision();
        }
    };

    // Keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') handleKeyPress('ENTER');
            else if (e.key === 'Backspace') handleKeyPress('BACK');
            else if (/^[A-Za-z]$/.test(e.key)) handleKeyPress(e.key.toUpperCase());
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentGuess, gameState, guesses]);

    // Letter feedback status map for keyboard
    const letterStatus: Record<string, WordleFeedback> = {};
    guesses.forEach((g) => {
        const feedback = WordleEngine.evaluateGuess(g, targetWord);
        g.split('').forEach((letter, i) => {
            const status = feedback[i];
            if (status === 'correct' || (status === 'present' && letterStatus[letter] !== 'correct')) {
                letterStatus[letter] = status;
            } else if (!letterStatus[letter]) {
                letterStatus[letter] = status;
            }
        });
    });

    return (
        <ArcadeGameShell
            title="Vibe Wordle"
            modeBadge={mode === 'daily' ? 'Daily' : 'Practice'}
            scoreDisplay={`${guesses.length}/6`}
            highScoreDisplay={bestGuesses > 0 ? `${bestGuesses} guesses` : undefined}
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
            <div className="w-full max-w-sm flex flex-col items-center justify-between h-full space-y-3 p-1">
                {/* Mode Selector */}
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
                        Guess the 5-letter music word in 6 tries.
                    </div>
                </div>

                {/* 6-Row Guess Grid */}
                <div className="grid grid-rows-6 gap-1.5 w-full max-w-[280px]">
                    {Array.from({ length: 6 }).map((_, rowIdx) => {
                        const guess = guesses[rowIdx];
                        const isCurrentRow = rowIdx === guesses.length;
                        const feedback = guess ? WordleEngine.evaluateGuess(guess, targetWord) : [];

                        return (
                            <div key={rowIdx} className="grid grid-cols-5 gap-1.5">
                                {Array.from({ length: 5 }).map((_, colIdx) => {
                                    let char = '';
                                    let status: WordleFeedback | 'empty' = 'empty';

                                    if (guess) {
                                        char = guess[colIdx] || '';
                                        status = feedback[colIdx] || 'empty';
                                    } else if (isCurrentRow) {
                                        char = currentGuess[colIdx] || '';
                                    }

                                    let bgClass = 'bg-white/5 border-white/15';
                                    if (status === 'correct') bgClass = 'bg-emerald-600 border-emerald-500 text-white';
                                    else if (status === 'present') bgClass = 'bg-amber-500 border-amber-400 text-white';
                                    else if (status === 'absent') bgClass = 'bg-gray-800 border-gray-700 text-gray-400';
                                    else if (char) bgClass = 'bg-white/10 border-white/40 text-white';

                                    return (
                                        <div
                                            key={colIdx}
                                            className={`aspect-square rounded-xl border flex items-center justify-center font-black text-lg transition-all ${bgClass}`}
                                        >
                                            {char}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Virtual Keyboard */}
                <div className="w-full space-y-1.5 max-w-sm pt-2">
                    {KEYBOARD_ROWS.map((row, rIdx) => (
                        <div key={rIdx} className="flex justify-center gap-1">
                            {row.map((key) => {
                                const status = letterStatus[key];
                                let keyBg = 'bg-white/15 text-white';
                                if (status === 'correct') keyBg = 'bg-emerald-600 text-white';
                                else if (status === 'present') keyBg = 'bg-amber-500 text-white';
                                else if (status === 'absent') keyBg = 'bg-gray-800 text-gray-500';

                                const isSpecial = key === 'ENTER' || key === 'BACK';

                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleKeyPress(key)}
                                        className={`h-11 rounded-lg font-bold text-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer ${
                                            isSpecial ? 'px-3 font-mono text-[11px]' : 'w-8 sm:w-9'
                                        } ${keyBg}`}
                                    >
                                        {key === 'BACK' ? <IoBackspaceOutline size={16} /> : key}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Game Over / Win Overlay */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Genius Wordplay!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            You found the secret track in <span className="text-primary font-bold">{guesses.length}</span> guesses!
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-2 w-56 space-y-1.5">
                            <p className="text-xs text-gray-400 flex justify-between">
                                Word: <span className="text-white font-mono font-bold tracking-widest">{targetWord}</span>
                            </p>
                            <p className="text-xs text-gray-400 flex justify-between">
                                Guesses: <span className="text-emerald-400 font-mono font-bold">{guesses.length}/6</span>
                            </p>
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

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <span className="text-4xl mb-2">💥</span>
                        <h3 className="text-xl font-black text-red-500 uppercase tracking-wider mb-1">
                            Out of Guesses!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            The word was <span className="text-amber-400 font-bold tracking-widest">{targetWord}</span>.
                        </p>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => resetGame()}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
