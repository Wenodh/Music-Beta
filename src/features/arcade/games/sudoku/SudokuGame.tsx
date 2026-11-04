import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DailySeedEngine } from '../../engine/dailySeedEngine';
import { SudokuEngine, SudokuDifficulty, SudokuPuzzle } from './sudokuEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoBackspaceOutline } from 'react-icons/io5';

interface SudokuGameProps {
    theme: GameTheme;
    onBack: () => void;
}

export const SudokuGame: React.FC<SudokuGameProps> = ({ theme, onBack }) => {
    const [difficulty, setDifficulty] = useState<SudokuDifficulty>('medium');
    const [dailySeed, setDailySeed] = useState(() => DailySeedEngine.getDailySeed('vibe-sudoku'));
    const [puzzle, setPuzzle] = useState<SudokuPuzzle>(() => SudokuEngine.generatePuzzle('medium', dailySeed));
    const [grid, setGrid] = useState<number[][]>(() => puzzle.initialGrid.map((r) => [...r]));
    const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
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
        getHighScore('vibe-sudoku', difficulty).then(setBestTime);
    }, [difficulty]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const resetGame = useCallback((diff: SudokuDifficulty = difficulty) => {
        const seed = `sudoku_${Date.now()}`;
        setDailySeed(seed);
        const pz = SudokuEngine.generatePuzzle(diff, seed);
        setPuzzle(pz);
        setGrid(pz.initialGrid.map((r) => [...r]));
        setSelectedCell(null);
        setTimerSeconds(0);
        setGameState('playing');
    }, [difficulty, setGameState]);

    useEffect(() => {
        resetGame(difficulty);
    }, []);

    const handleCellClick = (r: number, c: number) => {
        setSelectedCell({ r, c });
    };

    const handleNumberInput = async (num: number) => {
        if (!selectedCell || gameState !== 'playing') return;
        const { r, c } = selectedCell;

        // Cannot overwrite initial clue
        if (puzzle.initialGrid[r][c] !== 0) return;

        const next = grid.map((row) => [...row]);
        next[r][c] = num;
        setGrid(next);

        if (num > 0) {
            arcadeAudio.playJump();
        }

        // Check if solved
        if (SudokuEngine.isSolved(next, puzzle.solution)) {
            setGameState('completed');
            arcadeAudio.playMilestone();

            const timeMs = timerSeconds * 1000;
            const display = `${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, '0')}`;

            await ArcadeLeaderboardService.submitScore({
                gameId: 'vibe-sudoku',
                metricType: 'time_ms',
                score: timeMs,
                displayValue: display,
                difficulty,
            });

            const updated = await getHighScore('vibe-sudoku', difficulty);
            setBestTime(updated);
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (/^[1-9]$/.test(e.key)) {
                handleNumberInput(parseInt(e.key, 10));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                handleNumberInput(0);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, grid, gameState]);

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title="Vibe Sudoku"
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
                {/* Difficulty Selector */}
                <div className="w-full flex items-center justify-between text-xs px-2">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
                        {(['easy', 'medium', 'hard'] as SudokuDifficulty[]).map((d) => (
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
                </div>

                {/* 9x9 Sudoku Grid */}
                <div className="relative border-2 border-white/30 rounded-2xl overflow-hidden shadow-2xl bg-black/60 w-full max-w-[min(90vw,340px)] aspect-square grid grid-cols-9 grid-rows-9">
                    {grid.map((row, r) =>
                        row.map((val, c) => {
                            const isInitial = puzzle.initialGrid[r][c] !== 0;
                            const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                            const isConflict = val !== 0 && val !== puzzle.solution[r][c];

                            const borderB = r % 3 === 2 && r < 8 ? 'border-b-2 border-b-white/40' : 'border-b border-b-white/5';
                            const borderR = c % 3 === 2 && c < 8 ? 'border-r-2 border-r-white/40' : 'border-r border-r-white/5';

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    className={`flex items-center justify-center text-sm sm:text-base font-bold font-mono transition-all ${borderB} ${borderR} ${
                                        isSelected
                                            ? 'bg-primary/40 text-white'
                                            : isInitial
                                            ? 'bg-white/10 text-white font-black'
                                            : 'text-cyan-300 hover:bg-white/5'
                                    } ${isConflict ? 'text-red-400! bg-red-500/20!' : ''}`}
                                >
                                    {val > 0 ? val : ''}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Virtual Number Keypad (1 to 9 & Erase) */}
                <div className="w-full flex items-center justify-center gap-1.5 max-w-[340px]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberInput(num)}
                            className="flex-1 h-11 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-mono font-black text-sm rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={() => handleNumberInput(0)}
                        className="w-10 h-11 bg-red-500/20 hover:bg-red-500/30 active:scale-95 text-red-400 rounded-xl border border-red-500/30 transition-all flex items-center justify-center cursor-pointer"
                        aria-label="Erase cell"
                    >
                        <IoBackspaceOutline size={16} />
                    </button>
                </div>

                {/* Completed Overlay */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Sudoku Mastered!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">Completed in {formatTime(timerSeconds)}</p>
                        <button
                            onClick={() => resetGame()}
                            className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <IoRefresh size={16} /> Next Board
                        </button>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
