import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    VibeSolitaireEngine,
    SolitaireState,
    Card,
    Suit,
} from './vibeSolitaireEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface VibeSolitaireProps {
    theme: GameTheme;
    onBack: () => void;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

const VALUE_LABELS: Record<number, string> = {
    1: 'A',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: 'J',
    12: 'Q',
    13: 'K',
};

export const VibeSolitaireGame: React.FC<VibeSolitaireProps> = ({ theme, onBack }) => {
    const [gameStateObj, setGameStateObj] = useState<SolitaireState>(VibeSolitaireEngine.dealGame());
    const [selectedCard, setSelectedCard] = useState<{ source: 'waste' | 'tableau'; colIndex?: number; card: Card } | null>(null);
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(0);
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

    const stateRef = useRef(gameStateObj);
    stateRef.current = gameStateObj;

    useEffect(() => {
        getHighScore('vibe-solitaire', 'normal').then(setHighScore);
    }, []);

    const resetGame = useCallback(() => {
        setGameStateObj(VibeSolitaireEngine.dealGame());
        setSelectedCard(null);
        setScore(0);
        setMoves(0);
        setGameState('playing');
    }, [setGameState]);

    const drawFromStock = () => {
        if (gameState !== 'playing') return;
        arcadeAudio.playCardFlip();
        setGameStateObj((prev) => {
            const nextStock = [...prev.stock];
            const nextWaste = [...prev.waste];

            if (nextStock.length === 0) {
                // Recycle waste back into stock face down
                const recycled = nextWaste.reverse().map((c) => ({ ...c, faceUp: false }));
                return { ...prev, stock: recycled, waste: [] };
            }

            const card = nextStock.pop()!;
            card.faceUp = true;
            nextWaste.push(card);
            return { ...prev, stock: nextStock, waste: nextWaste };
        });
        setSelectedCard(null);
    };

    const handleFoundationClick = (fIndex: number) => {
        if (!selectedCard || gameState !== 'playing') return;
        const currentF = stateRef.current.foundations[fIndex];

        if (VibeSolitaireEngine.canMoveToFoundation(selectedCard.card, currentF)) {
            arcadeAudio.playMilestone();
            setMoves((m) => m + 1);
            setScore((s) => s + 10);

            setGameStateObj((prev) => {
                const nextFoundations = prev.foundations.map((f, i) => (i === fIndex ? [...f, selectedCard.card] : [...f]));
                let nextWaste = [...prev.waste];
                const nextTableau = prev.tableau.map((col) => [...col]);

                if (selectedCard.source === 'waste') {
                    nextWaste.pop();
                } else if (selectedCard.source === 'tableau' && selectedCard.colIndex !== undefined) {
                    const col = nextTableau[selectedCard.colIndex];
                    col.pop();
                    if (col.length > 0) {
                        col[col.length - 1].faceUp = true;
                    }
                }

                // Check win condition
                if (VibeSolitaireEngine.isGameWon(nextFoundations)) {
                    setGameState('completed');
                    ArcadeLeaderboardService.submitScore({
                        gameId: 'vibe-solitaire',
                        metricType: 'points',
                        score: score + 10,
                        displayValue: `${score + 10} pts`,
                        difficulty: 'normal',
                    });
                    getHighScore('vibe-solitaire', 'normal').then(setHighScore);
                }

                return {
                    ...prev,
                    waste: nextWaste,
                    tableau: nextTableau,
                    foundations: nextFoundations,
                };
            });
            setSelectedCard(null);
        }
    };

    const handleTableauColClick = (targetColIndex: number) => {
        if (!selectedCard || gameState !== 'playing') return;
        const targetCol = stateRef.current.tableau[targetColIndex];

        if (VibeSolitaireEngine.canMoveToTableau(selectedCard.card, targetCol)) {
            arcadeAudio.playCardFlip();
            setMoves((m) => m + 1);
            setScore((s) => s + 5);

            setGameStateObj((prev) => {
                const nextTableau = prev.tableau.map((col) => [...col]);
                let nextWaste = [...prev.waste];

                if (selectedCard.source === 'waste') {
                    nextWaste.pop();
                    nextTableau[targetColIndex].push(selectedCard.card);
                } else if (selectedCard.source === 'tableau' && selectedCard.colIndex !== undefined) {
                    const srcCol = nextTableau[selectedCard.colIndex];
                    const cardIndex = srcCol.findIndex((c) => c.id === selectedCard.card.id);
                    if (cardIndex !== -1) {
                        const movingCards = srcCol.splice(cardIndex);
                        nextTableau[targetColIndex].push(...movingCards);
                        if (srcCol.length > 0) {
                            srcCol[srcCol.length - 1].faceUp = true;
                        }
                    }
                }

                return {
                    ...prev,
                    waste: nextWaste,
                    tableau: nextTableau,
                };
            });
            setSelectedCard(null);
        }
    };

    const renderCard = (card: Card, isSelected = false) => {
        const isRed = VibeSolitaireEngine.isRed(card.suit);
        return (
            <div
                className={`w-9 h-13 rounded-lg flex flex-col justify-between p-1 select-none border text-xs font-bold transition-transform ${
                    isSelected ? 'ring-2 ring-cyan-400 scale-105 shadow-[0_0_10px_#06b6d4]' : ''
                } ${
                    card.faceUp
                        ? `bg-white ${isRed ? 'text-red-600 border-red-200' : 'text-gray-900 border-gray-300'} shadow-md`
                        : 'bg-cyan-800 border-cyan-700'
                }`}
            >
                {card.faceUp ? (
                    <>
                        <div className="flex justify-between items-center text-[10px] leading-tight">
                            <span>{VALUE_LABELS[card.value]}</span>
                            <span>{SUIT_SYMBOLS[card.suit]}</span>
                        </div>
                        <div className="self-center text-sm">{SUIT_SYMBOLS[card.suit]}</div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-cyan-400">
                        🎵
                    </div>
                )}
            </div>
        );
    };

    return (
        <ArcadeGameShell
            title="Klondike Solitaire"
            modeBadge={`MOVES ${moves}`}
            scoreDisplay={`Score: ${score}`}
            highScoreDisplay={highScore > 0 ? `Best: ${highScore} pts` : undefined}
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
                {/* Top Section: Stock/Waste & Foundations */}
                <div className="w-full flex items-center justify-between px-1">
                    {/* Stock & Waste */}
                    <div className="flex items-center gap-1.5">
                        <div
                            onClick={drawFromStock}
                            className="w-9 h-13 rounded-lg bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center cursor-pointer shadow-md"
                        >
                            <span className="text-xs text-cyan-300 font-bold">
                                {gameStateObj.stock.length > 0 ? '🂠' : '↺'}
                            </span>
                        </div>
                        <div
                            onClick={() => {
                                if (gameStateObj.waste.length > 0) {
                                    const topWaste = gameStateObj.waste[gameStateObj.waste.length - 1];
                                    setSelectedCard({ source: 'waste', card: topWaste });
                                }
                            }}
                            className="w-9 h-13 rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer"
                        >
                            {gameStateObj.waste.length > 0
                                ? renderCard(
                                      gameStateObj.waste[gameStateObj.waste.length - 1],
                                      selectedCard?.source === 'waste'
                                  )
                                : null}
                        </div>
                    </div>

                    {/* 4 Foundations */}
                    <div className="flex items-center gap-1">
                        {gameStateObj.foundations.map((pile, fIdx) => (
                            <div
                                key={fIdx}
                                onClick={() => handleFoundationClick(fIdx)}
                                className="w-9 h-13 rounded-lg border border-dashed border-cyan-400/30 flex items-center justify-center cursor-pointer bg-white/5"
                            >
                                {pile.length > 0 ? renderCard(pile[pile.length - 1]) : <span className="text-[10px] text-gray-500">A</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tableau 7 Columns */}
                <div className="w-full min-h-[320px] grid grid-cols-7 gap-1 px-1 bg-black/40 rounded-2xl border border-white/10 p-2 shadow-inner">
                    {gameStateObj.tableau.map((col, cIdx) => (
                        <div
                            key={cIdx}
                            onClick={() => {
                                if (col.length === 0) {
                                    handleTableauColClick(cIdx);
                                }
                            }}
                            className="flex flex-col items-center min-h-[280px] rounded-lg cursor-pointer"
                        >
                            {col.map((card, cardIdx) => (
                                <div
                                    key={card.id}
                                    style={{ marginTop: cardIdx === 0 ? 0 : -32 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (card.faceUp) {
                                            if (selectedCard) {
                                                handleTableauColClick(cIdx);
                                            } else {
                                                setSelectedCard({ source: 'tableau', colIndex: cIdx, card });
                                            }
                                        }
                                    }}
                                >
                                    {renderCard(card, selectedCard?.card.id === card.id)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Game Over Modal */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mb-3 animate-bounce">
                            <IoTrophy size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Solitaire Solved!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            Score: {score} pts ({moves} moves)
                        </p>
                        <button
                            onClick={resetGame}
                            className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <IoRefresh size={16} /> Deal New Game
                        </button>
                    </div>
                )}
            </div>
        </ArcadeGameShell>
    );
};
