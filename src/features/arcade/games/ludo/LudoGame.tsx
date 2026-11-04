import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { LudoEngine, LudoPlayer, LudoColor, LUDO_COLORS } from './ludoEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoPerson, IoTrophy } from 'react-icons/io5';

interface LudoGameProps {
    theme: GameTheme;
    onBack: () => void;
}

const COLOR_CLASSES: Record<LudoColor, { bg: string; border: string; text: string; glow: string }> = {
    red: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-400', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]' },
    green: { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]' },
    yellow: { bg: 'bg-amber-400', border: 'border-amber-300', text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]' },
    blue: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-400', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]' },
};

export const LudoGame: React.FC<LudoGameProps> = ({ theme, onBack }) => {
    // 2-player or 4-player mode
    const [playerCount, setPlayerCount] = useState<2 | 4>(2);
    const [players, setPlayers] = useState<LudoPlayer[]>([]);
    const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [movableTokenIds, setMovableTokenIds] = useState<number[]>([]);
    const [winner, setWinner] = useState<LudoPlayer | null>(null);
    const [turnsCount, setTurnsCount] = useState(0);
    const [knockoutsCount, setKnockoutsCount] = useState(0);
    const [bestTurns, setBestTurns] = useState<number>(0);
    const [isMuted, setIsMuted] = useState(true);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    const initGame = useCallback((count: 2 | 4 = playerCount) => {
        const colorsToUse: LudoColor[] = count === 2 ? ['red', 'yellow'] : LUDO_COLORS;
        const initialPlayers = LudoEngine.createDefaultPlayers(
            colorsToUse.map((color, idx) => ({
                color,
                isBot: idx > 0, // Human is Player 1 (Red), remaining are Bots
                name: idx === 0 ? 'You' : `Bot ${color.toUpperCase()}`,
            }))
        );
        setPlayers(initialPlayers);
        setCurrentTurnIdx(0);
        setDiceValue(null);
        setMovableTokenIds([]);
        setWinner(null);
        setTurnsCount(0);
        setKnockoutsCount(0);
        setGameState('playing');
    }, [playerCount, setGameState]);

    useEffect(() => {
        initGame(playerCount);
        getHighScore('ludo-mini', `${playerCount}p`).then(setBestTurns);
    }, [playerCount, initGame]);

    // Handle bot automatic turn
    useEffect(() => {
        if (gameState !== 'playing' || winner) return;
        const activePlayer = players[currentTurnIdx];
        if (!activePlayer || !activePlayer.isBot) return;

        // Bot automatically rolls dice if not yet rolled
        if (diceValue === null && !isRolling) {
            const rollTimer = setTimeout(() => {
                executeDiceRoll();
            }, 600);
            return () => clearTimeout(rollTimer);
        }

        // Bot automatically selects move after rolling
        if (diceValue !== null && movableTokenIds.length > 0) {
            const moveTimer = setTimeout(() => {
                const chosenTokenId = LudoEngine.selectBotMove(activePlayer, players, diceValue);
                if (chosenTokenId !== null) {
                    handleSelectToken(chosenTokenId);
                } else {
                    advanceToNextPlayer();
                }
            }, 700);
            return () => clearTimeout(moveTimer);
        } else if (diceValue !== null && movableTokenIds.length === 0) {
            const skipTimer = setTimeout(() => {
                advanceToNextPlayer();
            }, 800);
            return () => clearTimeout(skipTimer);
        }
    }, [currentTurnIdx, diceValue, isRolling, movableTokenIds, players, gameState, winner]);

    const executeDiceRoll = () => {
        if (isRolling || diceValue !== null || gameState !== 'playing') return;
        setIsRolling(true);
        arcadeAudio.playJump();

        // Dice roll animation simulation
        let rolls = 0;
        const interval = setInterval(() => {
            rolls++;
            if (rolls > 6) {
                clearInterval(interval);
                const finalDice = Math.floor(Math.random() * 6) + 1;
                setDiceValue(finalDice);
                setIsRolling(false);
                setTurnsCount((c) => c + 1);

                const activePlayer = players[currentTurnIdx];
                const movable = LudoEngine.getMovableTokens(activePlayer, finalDice);
                setMovableTokenIds(movable);

                if (movable.length === 0) {
                    // No moves available, next player after brief delay
                    setTimeout(() => {
                        advanceToNextPlayer();
                    }, 900);
                }
            }
        }, 60);
    };

    const handleSelectToken = async (tokenId: number) => {
        if (diceValue === null || gameState !== 'playing') return;
        const activePlayer = players[currentTurnIdx];
        if (!movableTokenIds.includes(tokenId)) return;

        const { nextPlayers, capturedToken, extraTurn } = LudoEngine.moveToken(
            players,
            currentTurnIdx,
            tokenId,
            diceValue
        );

        setPlayers(nextPlayers);
        setDiceValue(null);
        setMovableTokenIds([]);

        if (capturedToken) {
            arcadeAudio.playCollision();
            setKnockoutsCount((k) => k + 1);
        } else {
            arcadeAudio.playCollect();
        }

        // Check if player won
        if (LudoEngine.hasPlayerWon(nextPlayers[currentTurnIdx])) {
            const winningPlayer = nextPlayers[currentTurnIdx];
            setWinner(winningPlayer);
            setGameState('completed');
            arcadeAudio.playMilestone();

            if (!winningPlayer.isBot) {
                // Human player won!
                await ArcadeLeaderboardService.submitScore({
                    gameId: 'ludo-mini',
                    metricType: 'moves',
                    score: turnsCount,
                    displayValue: `${turnsCount} turns (${knockoutsCount} KOs)`,
                    difficulty: `${playerCount}p`,
                });
                const updated = await getHighScore('ludo-mini', `${playerCount}p`);
                setBestTurns(updated);
            }
            return;
        }

        // Extra turn if rolled 6 or captured a token
        if (extraTurn) {
            // Player gets another roll!
        } else {
            advanceToNextPlayer();
        }
    };

    const advanceToNextPlayer = () => {
        setDiceValue(null);
        setMovableTokenIds([]);
        setCurrentTurnIdx((prev) => (prev + 1) % players.length);
    };

    const activePlayer = players[currentTurnIdx];

    return (
        <ArcadeGameShell
            title="Ludo Mini"
            modeBadge={`${playerCount}P ${activePlayer?.name ?? ''}`}
            scoreDisplay={`Turn ${turnsCount}`}
            highScoreDisplay={bestTurns > 0 ? `Best: ${bestTurns} turns` : undefined}
            isMuted={isMuted}
            onToggleMute={() => {
                const next = !isMuted;
                setIsMuted(next);
                arcadeAudio.setEnabled(!next);
            }}
            onPause={pauseGame}
            showExitModal={showExitConfirm}
            onResume={resumeGame}
            onRestart={() => initGame(playerCount)}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-3 p-1">
                {/* Mode Selector */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                        onClick={() => {
                            setPlayerCount(2);
                            initGame(2);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            playerCount === 2 ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        2 Players (1v1 Bot)
                    </button>
                    <button
                        onClick={() => {
                            setPlayerCount(4);
                            initGame(4);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            playerCount === 4 ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        4 Players (FFA Bots)
                    </button>
                </div>

                {/* Player Status Ribbon */}
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-1">
                    {players.map((p, idx) => {
                        const isCurrent = idx === currentTurnIdx;
                        const conf = COLOR_CLASSES[p.color];
                        const finishedCount = p.tokens.filter((t) => t.step === 56).length;

                        return (
                            <div
                                key={p.color}
                                className={`rounded-xl p-1.5 border flex flex-col items-center transition-all ${
                                    isCurrent
                                        ? `${conf.border} bg-white/15 ${conf.glow} scale-105`
                                        : 'border-white/10 bg-white/5 opacity-70'
                                }`}
                            >
                                <div className="flex items-center gap-1 text-[11px] font-bold">
                                    <span className={`w-2 h-2 rounded-full ${conf.bg}`} />
                                    <span className={conf.text}>{p.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {finishedCount}/4 Home
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Ludo Mini Compact Board Representation */}
                <div className="relative border-2 border-white/20 rounded-2xl p-3 bg-black/60 shadow-2xl w-full max-w-[340px] aspect-square flex flex-col justify-between">
                    {/* Yards Representation & Active Track Status */}
                    <div className="grid grid-cols-2 gap-3 h-full">
                        {players.map((p) => {
                            const conf = COLOR_CLASSES[p.color];
                            const isMyTurn = players[currentTurnIdx]?.color === p.color;

                            return (
                                <div
                                    key={p.color}
                                    className={`relative rounded-xl border border-white/10 p-2 bg-white/5 flex flex-col justify-between`}
                                >
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className={conf.text}>{p.color.toUpperCase()} YARD</span>
                                        {isMyTurn && <span className="text-[10px] text-amber-400 animate-pulse">PLAYING</span>}
                                    </div>

                                    {/* 4 Tokens in Yard / Track */}
                                    <div className="grid grid-cols-2 gap-2 my-auto">
                                        {p.tokens.map((t) => {
                                            const isMovable = isMyTurn && movableTokenIds.includes(t.id);
                                            const isYard = t.step === -1;
                                            const isFinished = t.step === 56;

                                            return (
                                                <button
                                                    key={t.id}
                                                    disabled={!isMovable || p.isBot}
                                                    onClick={() => handleSelectToken(t.id)}
                                                    className={`h-11 rounded-xl flex flex-col items-center justify-center border font-bold text-[10px] transition-all cursor-pointer ${
                                                        isFinished
                                                            ? 'bg-amber-400/30 border-amber-400 text-amber-300'
                                                            : isMovable && !p.isBot
                                                            ? `${conf.bg} text-white ${conf.glow} animate-bounce cursor-pointer border-white`
                                                            : 'bg-white/10 border-white/15 text-gray-300'
                                                    }`}
                                                >
                                                    <IoPerson size={14} />
                                                    <span>{isFinished ? 'WIN' : isYard ? 'Yard' : `St ${t.step}`}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Central Dice Roll & Action Controller */}
                    <div className="mt-3 flex items-center justify-between bg-white/10 border border-white/15 rounded-xl p-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-300">
                                {activePlayer?.isBot ? `${activePlayer.name}'s turn...` : "It's your turn!"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                disabled={isRolling || diceValue !== null || activePlayer?.isBot || gameState !== 'playing'}
                                onClick={executeDiceRoll}
                                className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-1.5 transition-all shadow-lg ${
                                    diceValue === null && !activePlayer?.isBot
                                        ? 'bg-primary hover:bg-red-600 text-white cursor-pointer animate-pulse'
                                        : 'bg-white/10 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                🎲 {isRolling ? '...' : diceValue !== null ? `Rolled ${diceValue}` : 'Roll Dice'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Victory Modal */}
                {gameState === 'completed' && winner && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 animate-bounce">
                            <IoTrophy size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            {winner.name} Triumphs!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            All 4 tokens conquered home in {turnsCount} turns ({knockoutsCount} KOs).
                        </p>
                        <button
                            onClick={() => initGame(playerCount)}
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
