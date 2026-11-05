import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { TicTacToeEngine, TicTacToeCell, TicTacToeDifficulty } from './ticTacToeEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoPerson, IoHardwareChip } from 'react-icons/io5';

interface TicTacToeProps {
    theme: GameTheme;
    onBack: () => void;
}

export const TicTacToeGame: React.FC<TicTacToeProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
    const [difficulty, setDifficulty] = useState<TicTacToeDifficulty>('hard');
    const [userSymbol, setUserSymbol] = useState<'X' | 'O'>('X');
    const [board, setBoard] = useState<TicTacToeCell[]>(() => TicTacToeEngine.createEmptyBoard());
    const [turn, setTurn] = useState<'X' | 'O'>('X');
    const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const isAiMovingRef = useRef(false);
    const gameEpochRef = useRef(0); // Epoch counter preventing stale async callbacks across resets

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    const aiSymbol: 'X' | 'O' = userSymbol === 'X' ? 'O' : 'X';

    useEffect(() => {
        getHighScore('tic-tac-toe', `${mode}_${difficulty}`).then(setBestStreak);
    }, [mode, difficulty]);

    const resetBoard = useCallback((newUserSym?: 'X' | 'O', newDiff?: TicTacToeDifficulty) => {
        gameEpochRef.current += 1; // Increment epoch to invalidate any pending bot timers
        setBoard(TicTacToeEngine.createEmptyBoard());
        setTurn('X');
        setWinner(null);
        setWinningLine(null);
        isAiMovingRef.current = false;
        setGameState('playing');
        if (newUserSym) setUserSymbol(newUserSym);
        if (newDiff) setDifficulty(newDiff);
    }, [setGameState]);

    // Bot move execution
    useEffect(() => {
        if (mode !== 'ai' || turn !== aiSymbol || gameState !== 'playing' || winner) {
            isAiMovingRef.current = false;
            return;
        }

        if (isAiMovingRef.current) return;
        isAiMovingRef.current = true;

        const currentEpoch = gameEpochRef.current;

        const timer = setTimeout(() => {
            // Check if game reset or settings changed while timer was ticking
            if (gameEpochRef.current !== currentEpoch) {
                isAiMovingRef.current = false;
                return;
            }

            const botMove = TicTacToeEngine.selectBotMove(board, aiSymbol, difficulty);
            if (botMove !== -1 && board[botMove] === null) {
                applyMove(botMove, aiSymbol);
            }
            isAiMovingRef.current = false;
        }, 350);

        return () => {
            clearTimeout(timer);
            isAiMovingRef.current = false;
        };
    }, [turn, mode, board, gameState, winner, aiSymbol, difficulty]);

    const applyMove = async (index: number, player: 'X' | 'O') => {
        const nextBoard = [...board];
        nextBoard[index] = player;
        setBoard(nextBoard);
        arcadeAudio.playJump();

        const result = TicTacToeEngine.checkWinner(nextBoard);
        if (result.winner) {
            setWinner(result.winner);
            setWinningLine(result.winningLine);
            setGameState('completed');

            if (result.winner === userSymbol) {
                // Human Won!
                arcadeAudio.playMilestone();
                const nextStreak = streak + 1;
                setStreak(nextStreak);

                if (mode === 'ai') {
                    await ArcadeLeaderboardService.submitScore({
                        gameId: 'tic-tac-toe',
                        metricType: 'streak',
                        score: nextStreak,
                        displayValue: `${nextStreak} Streak`,
                        difficulty,
                    });
                    const updated = await getHighScore('tic-tac-toe', `${mode}_${difficulty}`);
                    setBestStreak(updated);
                }
            } else if (result.winner === aiSymbol) {
                // Bot Won
                arcadeAudio.playCollision();
                setStreak(0);
            } else {
                // Draw
                arcadeAudio.playCollect();
            }
        } else {
            setTurn(player === 'X' ? 'O' : 'X');
        }
    };

    const handleCellClick = (index: number) => {
        if (gameState !== 'playing' || board[index] !== null || winner) return;
        if (mode === 'ai' && turn !== userSymbol) return; // Wait for bot

        applyMove(index, turn);
    };

    const getDifficultyLabel = () => {
        if (mode === 'pvp') return 'PASS & PLAY';
        return `VS BOT (${difficulty.toUpperCase()})`;
    };

    return (
        <ArcadeGameShell
            title="Tic-Tac-Toe Pro"
            modeBadge={getDifficultyLabel()}
            scoreDisplay={`Streak: ${streak}`}
            highScoreDisplay={bestStreak > 0 ? `Best: ${bestStreak}` : undefined}
            isMuted={isMuted}
            onToggleMute={() => {
                const next = !isMuted;
                setIsMuted(next);
                arcadeAudio.setEnabled(!next);
            }}
            onPause={pauseGame}
            showExitModal={showExitConfirm}
            onResume={resumeGame}
            onRestart={() => resetBoard()}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-3 p-1">
                {/* Mode Selector (AI vs PVP) */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 text-xs w-full justify-center">
                    <button
                        onClick={() => {
                            setMode('ai');
                            setStreak(0);
                            resetBoard();
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            mode === 'ai' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoHardwareChip size={14} /> VS Bot
                    </button>
                    <button
                        onClick={() => {
                            setMode('pvp');
                            setStreak(0);
                            resetBoard();
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            mode === 'pvp' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoPerson size={14} /> 2-Player Local
                    </button>
                </div>

                {/* Sub-controls: Difficulty & Starting Symbol (when in AI mode) */}
                {mode === 'ai' && (
                    <div className="flex items-center justify-between w-full px-1 gap-2 text-xs">
                        {/* Difficulty Selector */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                            {(['easy', 'medium', 'hard'] as TicTacToeDifficulty[]).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => {
                                        setDifficulty(d);
                                        setStreak(0);
                                        resetBoard(userSymbol, d);
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                                        difficulty === d ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        {/* Starting Symbol Toggle */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                            <span className="text-[10px] text-gray-400 uppercase font-bold px-1">Play:</span>
                            {(['X', 'O'] as const).map((sym) => (
                                <button
                                    key={sym}
                                    onClick={() => {
                                        setUserSymbol(sym);
                                        setStreak(0);
                                        resetBoard(sym, difficulty);
                                    }}
                                    className={`w-6 h-6 text-xs font-black rounded-lg transition-all cursor-pointer ${
                                        userSymbol === sym ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {sym}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Turn Status Indicator */}
                <div className="flex items-center gap-3 text-xs font-bold text-gray-300">
                    <span className={`px-3 py-1 rounded-full border ${
                        turn === 'X'
                            ? 'border-primary bg-primary/20 text-white shadow-sm'
                            : 'border-white/10 text-gray-400'
                    }`}>
                        Player X {mode === 'ai' && (userSymbol === 'X' ? '(You)' : '(Bot)')}
                    </span>
                    <span className="text-[11px] text-gray-500">VS</span>
                    <span className={`px-3 py-1 rounded-full border ${
                        turn === 'O'
                            ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-sm'
                            : 'border-white/10 text-gray-400'
                    }`}>
                        Player O {mode === 'ai' && (userSymbol === 'O' ? '(You)' : '(Bot)')}
                    </span>
                </div>

                {/* 3x3 Grid */}
                <div className="relative border-2 border-white/20 rounded-2xl p-3 bg-black/60 shadow-2xl grid grid-cols-3 gap-2.5 w-full max-w-[min(90vw,320px)] aspect-square">
                    {board.map((cell, idx) => {
                        const isWinningCell = winningLine?.includes(idx);
                        return (
                            <button
                                key={idx}
                                disabled={cell !== null || (mode === 'ai' && turn !== userSymbol) || !!winner}
                                onClick={() => handleCellClick(idx)}
                                className={`rounded-xl flex items-center justify-center font-black text-4xl select-none transition-all cursor-pointer ${
                                    isWinningCell
                                        ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-300 scale-105'
                                        : cell === 'X'
                                        ? 'bg-primary/20 border border-primary/40 text-red-400'
                                        : cell === 'O'
                                        ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-400'
                                        : 'bg-white/10 border border-white/10 hover:bg-white/20 active:scale-95'
                                }`}
                            >
                                {cell}
                            </button>
                        );
                    })}
                </div>

                {/* Winner / Draw Modal */}
                {winner && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 animate-bounce">
                            {winner === 'draw' ? '🤝' : winner === userSymbol ? '🎉' : '🤖'}
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            {winner === 'draw'
                                ? 'Stalemate Draw!'
                                : winner === userSymbol
                                ? 'Victory Crowned!'
                                : 'AI Outsmarted You!'}
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            {winner === userSymbol
                                ? `Streak: ${streak} | Difficulty: ${difficulty.toUpperCase()}`
                                : winner === aiSymbol
                                ? `Defeated by ${difficulty.toUpperCase()} Bot.`
                                : 'Impenetrable defense from both sides.'}
                        </p>
                        <button
                            onClick={() => resetBoard()}
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
