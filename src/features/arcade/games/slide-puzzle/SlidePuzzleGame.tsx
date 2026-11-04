import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { SlidePuzzleEngine } from './slidePuzzleEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle } from 'react-icons/io5';

interface SlidePuzzleGameProps {
    theme: GameTheme;
    onBack: () => void;
}

export const SlidePuzzleGame: React.FC<SlidePuzzleGameProps> = ({ theme, onBack }) => {
    const [tiles, setTiles] = useState<number[]>(() => SlidePuzzleEngine.generateSolvableBoard());
    const [moveCount, setMoveCount] = useState(0);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [bestMoves, setBestMoves] = useState<number>(0);
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
        getHighScore('slide-puzzle', 'normal', 'practice').then(setBestMoves);
    }, []);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimerSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const resetGame = useCallback(() => {
        setTiles(SlidePuzzleEngine.generateSolvableBoard());
        setMoveCount(0);
        setTimerSeconds(0);
        setGameState('playing');
    }, [setGameState]);

    useEffect(() => {
        resetGame();
    }, []);

    const handleTileClick = async (index: number) => {
        if (gameState !== 'playing') return;
        const emptyIndex = tiles.indexOf(0);

        if (SlidePuzzleEngine.canMove(index, emptyIndex)) {
            const next = [...tiles];
            [next[index], next[emptyIndex]] = [next[emptyIndex], next[index]];
            setTiles(next);
            const nextMoves = moveCount + 1;
            setMoveCount(nextMoves);
            arcadeAudio.playJump();

            if (SlidePuzzleEngine.isSolved(next)) {
                setGameState('completed');
                arcadeAudio.playMilestone();

                await ArcadeLeaderboardService.submitScore({
                    gameId: 'slide-puzzle',
                    metricType: 'moves',
                    score: nextMoves,
                    displayValue: `${nextMoves} moves`,
                });

                const updated = await getHighScore('slide-puzzle', 'normal', 'practice');
                setBestMoves(updated);
            }
        }
    };

    const formatTime = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ArcadeGameShell
            title="15-Slide Puzzle"
            scoreDisplay={`${moveCount} moves`}
            highScoreDisplay={bestMoves > 0 ? `${bestMoves} moves` : undefined}
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
            <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-4 p-2">
                {/* 4x4 Tiles Grid */}
                <div className="relative border-2 border-white/20 rounded-3xl overflow-hidden shadow-2xl bg-black/60 w-full max-w-[min(90vw,340px)] aspect-square p-2 grid grid-cols-4 grid-rows-4 gap-2">
                    {tiles.map((val, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleTileClick(idx)}
                            className={`rounded-2xl flex items-center justify-center font-black font-mono text-xl sm:text-2xl transition-all duration-100 select-none ${
                                val === 0
                                    ? 'bg-transparent border border-dashed border-white/10 cursor-default'
                                    : 'bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white shadow-md'
                            }`}
                        >
                            {val > 0 ? val : ''}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between w-full max-w-[340px] text-xs text-gray-400 px-2 font-mono">
                    <span>Time: {formatTime(timerSeconds)}</span>
                    <span>Moves: {moveCount}</span>
                </div>

                {/* Win Overlay */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                            <IoCheckmarkCircle size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Puzzle Solved!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            Finished in <span className="text-primary font-bold">{moveCount}</span> moves ({formatTime(timerSeconds)})
                        </p>
                        <button
                            onClick={resetGame}
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
