import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    ConnectFourEngine,
    ConnectFourCell,
    CONNECT_FOUR_ROWS,
    CONNECT_FOUR_COLS,
} from './connectFourEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoCheckmarkCircle, IoPerson, IoHardwareChip } from 'react-icons/io5';

interface ConnectFourProps {
    theme: GameTheme;
    onBack: () => void;
}

export const ConnectFourGame: React.FC<ConnectFourProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
    const [board, setBoard] = useState<ConnectFourCell[][]>(() => ConnectFourEngine.createEmptyBoard());
    const [turn, setTurn] = useState<'R' | 'Y'>('R');
    const [winner, setWinner] = useState<'R' | 'Y' | 'draw' | null>(null);
    const [winningCells, setWinningCells] = useState<{ r: number; c: number }[] | null>(null);
    const [turnsCount, setTurnsCount] = useState(0);
    const [bestTurns, setBestTurns] = useState(0);
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
        getHighScore('connect-four', mode).then(setBestTurns);
    }, [mode]);

    const resetBoard = useCallback(() => {
        setBoard(ConnectFourEngine.createEmptyBoard());
        setTurn('R');
        setWinner(null);
        setWinningCells(null);
        setTurnsCount(0);
        setGameState('playing');
    }, [setGameState]);

    // Bot move execution
    useEffect(() => {
        if (mode !== 'ai' || turn !== 'Y' || gameState !== 'playing' || winner) return;

        const timer = setTimeout(() => {
            const botCol = ConnectFourEngine.selectBotMove(board, 'Y', 3);
            if (botCol !== undefined) {
                applyDrop(botCol, 'Y');
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [turn, mode, board, gameState, winner]);

    const applyDrop = async (col: number, player: 'R' | 'Y') => {
        const { newBoard, success } = ConnectFourEngine.dropDisc(board, col, player);
        if (!success) return;

        setBoard(newBoard);
        arcadeAudio.playJump();
        const nextTurns = turnsCount + 1;
        setTurnsCount(nextTurns);

        const check = ConnectFourEngine.checkWinner(newBoard);
        if (check.winner) {
            setWinner(check.winner);
            setWinningCells(check.winningCells);
            setGameState('completed');

            if (check.winner === 'R') {
                arcadeAudio.playMilestone();
                if (mode === 'ai') {
                    await ArcadeLeaderboardService.submitScore({
                        gameId: 'connect-four',
                        metricType: 'moves',
                        score: nextTurns,
                        displayValue: `${nextTurns} Turns`,
                        difficulty: 'normal',
                    });
                    const updated = await getHighScore('connect-four', 'ai');
                    setBestTurns(updated);
                }
            } else if (check.winner === 'Y') {
                arcadeAudio.playCollision();
            } else {
                arcadeAudio.playCollect();
            }
        } else {
            setTurn(player === 'R' ? 'Y' : 'R');
        }
    };

    const handleColumnClick = (col: number) => {
        if (gameState !== 'playing' || winner) return;
        if (mode === 'ai' && turn !== 'R') return; // AI turn

        applyDrop(col, turn);
    };

    return (
        <ArcadeGameShell
            title="Connect Four"
            modeBadge={mode === 'ai' ? 'VS BOT' : 'PASS & PLAY'}
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
            onRestart={resetBoard}
            onExit={exitGame}
            theme={theme}
        >
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-3 p-1">
                {/* Mode Selectors */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                        onClick={() => {
                            setMode('ai');
                            resetBoard();
                        }}
                        className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                            mode === 'ai' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoHardwareChip size={14} /> Solo VS Bot
                    </button>
                    <button
                        onClick={() => {
                            setMode('pvp');
                            resetBoard();
                        }}
                        className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                            mode === 'pvp' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoPerson size={14} /> 2-Player Local
                    </button>
                </div>

                {/* Turn Header */}
                <div className="flex items-center gap-3 text-xs font-bold">
                    <span className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${turn === 'R' ? 'border-red-400 bg-red-500/20 text-red-300' : 'border-white/10 text-gray-400'}`}>
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        Red {mode === 'ai' ? '(You)' : '(P1)'}
                    </span>
                    <span className="text-gray-400">VS</span>
                    <span className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${turn === 'Y' ? 'border-amber-400 bg-amber-400/20 text-amber-300' : 'border-white/10 text-gray-400'}`}>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        Yellow {mode === 'ai' ? '(Bot)' : '(P2)'}
                    </span>
                </div>

                {/* 7x6 Connect Four Board */}
                <div className="relative border-4 border-blue-600 rounded-3xl p-2.5 bg-blue-900/40 shadow-2xl w-full max-w-[340px]">
                    {/* Top Column Drop Indicators */}
                    <div className="grid grid-cols-7 gap-1.5 mb-2">
                        {Array.from({ length: CONNECT_FOUR_COLS }).map((_, c) => (
                            <button
                                key={c}
                                disabled={board[0][c] !== null || (mode === 'ai' && turn !== 'R') || !!winner}
                                onClick={() => handleColumnClick(c)}
                                className="h-5 rounded-lg bg-white/10 hover:bg-white/30 active:bg-white/40 flex items-center justify-center text-[10px] text-white/70 transition-all cursor-pointer"
                            >
                                ↓
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {board.map((row, r) =>
                            row.map((cell, c) => {
                                const isWinCell = winningCells?.some((wc) => wc.r === r && wc.c === c);
                                return (
                                    <button
                                        key={`${r}-${c}`}
                                        disabled={board[0][c] !== null || (mode === 'ai' && turn !== 'R') || !!winner}
                                        onClick={() => handleColumnClick(c)}
                                        className="aspect-square rounded-full p-1 bg-black/60 flex items-center justify-center transition-all cursor-pointer"
                                    >
                                        <div
                                            className={`w-full h-full rounded-full transition-all ${
                                                isWinCell
                                                    ? 'scale-110 shadow-[0_0_15px_#f59e0b] border-2 border-white'
                                                    : ''
                                            } ${
                                                cell === 'R'
                                                    ? 'bg-red-500 shadow-inner'
                                                    : cell === 'Y'
                                                    ? 'bg-amber-400 shadow-inner'
                                                    : 'bg-black/40'
                                            }`}
                                        />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Winner Overlay */}
                {winner && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 animate-bounce">
                            {winner === 'draw' ? '🤝' : winner === 'R' ? '🔴' : '🟡'}
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            {winner === 'draw' ? 'Full Board Draw!' : `${winner === 'R' ? 'Red' : 'Yellow'} Wins!`}
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            Connected 4 in {turnsCount} turns.
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
