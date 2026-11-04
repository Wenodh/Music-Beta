import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { TicTacToeEngine, TicTacToeCell } from './ticTacToeEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoPerson, IoHardwareChip } from 'react-icons/io5';

interface TicTacToeProps {
    theme: GameTheme;
    onBack: () => void;
}

export const TicTacToeGame: React.FC<TicTacToeProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
    const [board, setBoard] = useState<TicTacToeCell[]>(() => TicTacToeEngine.createEmptyBoard());
    const [turn, setTurn] = useState<'X' | 'O'>('X');
    const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
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
        getHighScore('tic-tac-toe', mode).then(setBestStreak);
    }, [mode]);

    const resetBoard = useCallback(() => {
        setBoard(TicTacToeEngine.createEmptyBoard());
        setTurn('X');
        setWinner(null);
        setWinningLine(null);
        setGameState('playing');
    }, [setGameState]);

    // Bot move execution
    useEffect(() => {
        if (mode !== 'ai' || turn !== 'O' || gameState !== 'playing' || winner) return;

        const timer = setTimeout(() => {
            const bestMove = TicTacToeEngine.getBestMove(board, 'O');
            if (bestMove !== undefined && board[bestMove] === null) {
                applyMove(bestMove, 'O');
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [turn, mode, board, gameState, winner]);

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

            if (result.winner === 'X') {
                arcadeAudio.playMilestone();
                const nextStreak = streak + 1;
                setStreak(nextStreak);

                if (mode === 'ai') {
                    await ArcadeLeaderboardService.submitScore({
                        gameId: 'tic-tac-toe',
                        metricType: 'streak',
                        score: nextStreak,
                        displayValue: `${nextStreak} Streak`,
                        difficulty: 'unbeatable',
                    });
                    const updated = await getHighScore('tic-tac-toe', 'ai');
                    setBestStreak(updated);
                }
            } else if (result.winner === 'O') {
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
        if (mode === 'ai' && turn !== 'X') return; // AI is thinking

        applyMove(index, turn);
    };

    return (
        <ArcadeGameShell
            title="Tic-Tac-Toe Pro"
            modeBadge={mode === 'ai' ? 'VS UNBEATABLE BOT' : 'PASS & PLAY'}
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
            onRestart={resetBoard}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-4 p-1">
                {/* Mode Toggles */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                        onClick={() => {
                            setMode('ai');
                            setStreak(0);
                            resetBoard();
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                            mode === 'ai' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoHardwareChip size={14} /> Unbeatable AI
                    </button>
                    <button
                        onClick={() => {
                            setMode('pvp');
                            setStreak(0);
                            resetBoard();
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                            mode === 'pvp' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoPerson size={14} /> 2-Player Local
                    </button>
                </div>

                {/* Turn Status Indicator */}
                <div className="flex items-center gap-3 text-xs font-bold text-gray-300">
                    <span className={`px-3 py-1 rounded-full border ${turn === 'X' ? 'border-primary bg-primary/20 text-white' : 'border-white/10 text-gray-400'}`}>
                        Player X {mode === 'ai' && '(You)'}
                    </span>
                    <span>VS</span>
                    <span className={`px-3 py-1 rounded-full border ${turn === 'O' ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300' : 'border-white/10 text-gray-400'}`}>
                        Player O {mode === 'ai' && '(Bot)'}
                    </span>
                </div>

                {/* 3x3 Grid */}
                <div className="relative border-2 border-white/20 rounded-2xl p-3 bg-black/60 shadow-2xl grid grid-cols-3 gap-2.5 w-full max-w-[min(90vw,320px)] aspect-square">
                    {board.map((cell, idx) => {
                        const isWinningCell = winningLine?.includes(idx);
                        return (
                            <button
                                key={idx}
                                disabled={cell !== null || (mode === 'ai' && turn !== 'X') || !!winner}
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
                            {winner === 'draw' ? '🤝' : winner === 'X' ? '🎉' : '🤖'}
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            {winner === 'draw' ? 'Stalemate Draw!' : `${winner} Takes the Crown!`}
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            {winner === 'X' ? `Streak: ${streak}` : winner === 'O' ? 'AI Outsmarted you!' : 'Perfect defense from both sides.'}
                        </p>
                        <button
                            onClick={resetBoard}
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
