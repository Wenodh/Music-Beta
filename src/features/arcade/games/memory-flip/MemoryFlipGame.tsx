import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { MemoryFlipEngine, MemoryCard } from './memoryFlipEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface MemoryFlipProps {
    theme: GameTheme;
    onBack: () => void;
}

export const MemoryFlipGame: React.FC<MemoryFlipProps> = ({ theme, onBack }) => {
    const [cards, setCards] = useState<MemoryCard[]>(MemoryFlipEngine.createDeck());
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matchedPairs, setMatchedPairs] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isChecking, setIsChecking] = useState(false);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack, initialState: 'playing' });

    const cardsRef = useRef(cards);
    cardsRef.current = cards;

    useEffect(() => {
        getHighScore('memory-flip', 'normal').then(setHighScore);
    }, []);

    const resetGame = useCallback(() => {
        setCards(MemoryFlipEngine.createDeck());
        setFlippedIndices([]);
        setMoves(0);
        setMatchedPairs(0);
        setIsChecking(false);
        setGameState('playing');
    }, [setGameState]);

    const handleCardClick = (index: number) => {
        if (gameState !== 'playing' || isChecking) return;
        const card = cards[index];
        if (card.isFlipped || card.isMatched) return;

        arcadeAudio.playCardFlip();

        const newFlipped = [...flippedIndices, index];
        const newCards = [...cards];
        newCards[index].isFlipped = true;
        setCards(newCards);
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setMoves((m) => m + 1);
            setIsChecking(true);

            const [idx1, idx2] = newFlipped;
            const c1 = newCards[idx1];
            const c2 = newCards[idx2];

            if (MemoryFlipEngine.checkMatch(c1, c2)) {
                // Match!
                setTimeout(() => {
                    arcadeAudio.playMilestone();
                    newCards[idx1].isMatched = true;
                    newCards[idx2].isMatched = true;
                    setCards([...newCards]);
                    setFlippedIndices([]);
                    setIsChecking(false);

                    setMatchedPairs((p) => {
                        const next = p + 1;
                        if (next === 8) {
                            // All pairs found
                            setGameState('completed');
                            ArcadeLeaderboardService.submitScore({
                                gameId: 'memory-flip',
                                metricType: 'moves',
                                score: moves + 1,
                                displayValue: `${moves + 1} moves`,
                                difficulty: 'normal',
                            });
                            getHighScore('memory-flip', 'normal').then(setHighScore);
                        }
                        return next;
                    });
                }, 500);
            } else {
                // Not a match
                setTimeout(() => {
                    arcadeAudio.playCollision();
                    newCards[idx1].isFlipped = false;
                    newCards[idx2].isFlipped = false;
                    setCards([...newCards]);
                    setFlippedIndices([]);
                    setIsChecking(false);
                }, 900);
            }
        }
    };

    return (
        <ArcadeGameShell
            title="Memory Flip"
            modeBadge={`PAIRS ${matchedPairs}/8`}
            scoreDisplay={`Moves: ${moves}`}
            highScoreDisplay={highScore > 0 ? `Best: ${highScore} moves` : undefined}
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
                {/* HUD */}
                <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-gray-300">
                    <span className="text-cyan-400">Match all 8 musical pairs</span>
                    <span>Moves: {moves}</span>
                </div>

                {/* 4x4 Grid */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden bg-black/90 shadow-2xl p-3 w-full aspect-square max-w-[340px]">
                    <div className="grid grid-cols-4 gap-2 w-full h-full">
                        {cards.map((card, idx) => (
                            <button
                                key={card.id}
                                disabled={card.isFlipped || card.isMatched || isChecking}
                                onClick={() => handleCardClick(idx)}
                                className={`rounded-xl flex items-center justify-center font-bold text-2xl transition-all duration-300 cursor-pointer ${
                                    card.isFlipped || card.isMatched
                                        ? 'bg-cyan-500/20 border-2 border-cyan-400 text-white shadow-[0_0_10px_#06b6d4]'
                                        : 'bg-white/10 hover:bg-white/20 border border-white/20 text-transparent active:scale-95'
                                }`}
                            >
                                <span>{card.isFlipped || card.isMatched ? card.symbol : '🎵'}</span>
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
                                Memory Master!
                            </h3>
                            <p className="text-xs text-gray-300 mb-4">
                                Solved in {moves} moves
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
            </div>
        </ArcadeGameShell>
    );
};
