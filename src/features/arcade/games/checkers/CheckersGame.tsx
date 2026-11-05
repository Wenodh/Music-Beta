import React, { useState, useEffect, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    CheckersEngine,
    CheckersPiece,
    CheckersPieceColor,
    CheckersMove,
} from './checkersEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoPerson, IoHardwareChip } from 'react-icons/io5';

interface CheckersProps {
    theme: GameTheme;
    onBack: () => void;
}

export const CheckersGame: React.FC<CheckersProps> = ({ theme, onBack }) => {
    const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
    const [board, setBoard] = useState<(CheckersPiece | null)[][]>(() => CheckersEngine.createInitialBoard());
    const [turn, setTurn] = useState<CheckersPieceColor>('red'); // Red moves first (standard)
    const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
    const [legalMoves, setLegalMoves] = useState<CheckersMove[]>([]);
    const [winner, setWinner] = useState<CheckersPieceColor | null>(null);
    const [movesCount, setMovesCount] = useState(0);
    const [bestMoves, setBestMoves] = useState(0);
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
        getHighScore('vibe-checkers', mode).then(setBestMoves);
    }, [mode]);

    const resetGame = useCallback(() => {
        const initial = CheckersEngine.createInitialBoard();
        setBoard(initial);
        setTurn('red');
        setSelectedPos(null);
        setLegalMoves(CheckersEngine.getLegalMoves(initial, 'red'));
        setWinner(null);
        setMovesCount(0);
        setGameState('playing');
    }, [setGameState]);

    useEffect(() => {
        resetGame();
    }, [resetGame]);

    // AI bot turn
    useEffect(() => {
        if (mode !== 'ai' || turn !== 'black' || gameState !== 'playing' || winner) return;

        const timer = setTimeout(() => {
            const botMove = CheckersEngine.selectBotMove(board, 'black', 3);
            if (botMove) {
                executeMove(botMove);
            } else {
                // No moves for black -> Red wins!
                handleWin('red');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [turn, mode, board, gameState, winner]);

    const executeMove = async (move: CheckersMove) => {
        const nextBoard = CheckersEngine.executeMove(board, move);
        setBoard(nextBoard);
        setSelectedPos(null);

        const nextMovesCount = movesCount + 1;
        setMovesCount(nextMovesCount);

        if (move.captures.length > 0) {
            arcadeAudio.playCollision();
        } else {
            arcadeAudio.playJump();
        }

        const nextTurn: CheckersPieceColor = turn === 'red' ? 'black' : 'red';
        const nextLegal = CheckersEngine.getLegalMoves(nextBoard, nextTurn);
        setLegalMoves(nextLegal);

        if (nextLegal.length === 0) {
            // Player whose turn it is has no moves left -> opposite player wins!
            handleWin(turn);
        } else {
            setTurn(nextTurn);
        }
    };

    const handleWin = async (winningColor: CheckersPieceColor) => {
        setWinner(winningColor);
        setGameState('completed');

        if (winningColor === 'red') {
            arcadeAudio.playMilestone();
            if (mode === 'ai') {
                await ArcadeLeaderboardService.submitScore({
                    gameId: 'vibe-checkers',
                    metricType: 'moves',
                    score: movesCount,
                    displayValue: `${movesCount} Moves`,
                    difficulty: 'normal',
                });
                const updated = await getHighScore('vibe-checkers', 'ai');
                setBestMoves(updated);
            }
        } else {
            arcadeAudio.playCollision();
        }
    };

    const handleSquareClick = (r: number, c: number) => {
        if (gameState !== 'playing' || winner) return;
        if (mode === 'ai' && turn !== 'red') return; // Bot turn

        const clickedPiece = board[r][c];

        // 1. If clicking own piece, select it
        if (clickedPiece && clickedPiece.color === turn) {
            setSelectedPos({ r, c });
            return;
        }

        // 2. If already selected a piece and clicked a destination square, execute if legal
        if (selectedPos) {
            const matchingMove = legalMoves.find(
                (m) =>
                    m.from.r === selectedPos.r &&
                    m.from.c === selectedPos.c &&
                    m.to.r === r &&
                    m.to.c === c
            );

            if (matchingMove) {
                executeMove(matchingMove);
            } else {
                setSelectedPos(null);
            }
        }
    };

    // Calculate highlighted squares for current selection
    const destinationsForSelected = selectedPos
        ? legalMoves
              .filter((m) => m.from.r === selectedPos.r && m.from.c === selectedPos.c)
              .map((m) => m.to)
        : [];

    const isMandatoryCapture = legalMoves.length > 0 && legalMoves[0].captures.length > 0;

    return (
        <ArcadeGameShell
            title="Vibe Checkers"
            modeBadge={mode === 'ai' ? 'VS BOT (ENGLISH/US RULES)' : 'PASS & PLAY'}
            scoreDisplay={`Moves: ${movesCount}`}
            highScoreDisplay={bestMoves > 0 ? `Best: ${bestMoves} moves` : undefined}
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
                {/* Mode Toggles */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                        onClick={() => {
                            setMode('ai');
                            resetGame();
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
                            resetGame();
                        }}
                        className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                            mode === 'pvp' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoPerson size={14} /> 2-Player Local
                    </button>
                </div>

                {/* Turn & Mandatory Jump Banner */}
                <div className="flex items-center justify-between w-full px-2 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${turn === 'red' ? 'bg-red-500' : 'bg-gray-800 border border-white/40'}`} />
                        <span className={turn === 'red' ? 'text-red-400' : 'text-gray-300'}>
                            {turn === 'red' ? "Red's Turn (You)" : "Black's Turn (Bot)"}
                        </span>
                    </div>

                    {isMandatoryCapture && (
                        <span className="text-[11px] text-amber-400 animate-pulse font-mono">
                            ⚡ Mandatory Jump!
                        </span>
                    )}
                </div>

                {/* 8x8 Checkers Board */}
                <div className="relative border-4 border-amber-900/60 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-8 grid-rows-8 w-full max-w-[min(90vw,340px)] aspect-square bg-[#3b271d]">
                    {board.map((row, r) =>
                        row.map((piece, c) => {
                            const isDark = (r + c) % 2 === 1;
                            const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                            const isDestination = destinationsForSelected.some((d) => d.r === r && d.c === c);

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    disabled={!isDark || (mode === 'ai' && turn !== 'red') || !!winner}
                                    onClick={() => handleSquareClick(r, c)}
                                    className={`relative flex items-center justify-center transition-all cursor-pointer ${
                                        isDark ? 'bg-[#2b1810]' : 'bg-[#d6b896]'
                                    } ${
                                        isSelected ? 'ring-2 ring-amber-400 ring-inset bg-amber-900/40' : ''
                                    }`}
                                >
                                    {/* Destination indicator dot */}
                                    {isDestination && (
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_#34d399] animate-pulse z-10" />
                                    )}

                                    {/* Piece */}
                                    {piece && (
                                        <div
                                            className={`w-[80%] h-[80%] rounded-full border-2 flex items-center justify-center font-black text-xs shadow-md transition-all ${
                                                piece.color === 'red'
                                                    ? 'bg-red-600 border-red-300 text-white'
                                                    : 'bg-zinc-900 border-zinc-600 text-white'
                                            }`}
                                        >
                                            {piece.type === 'king' && '👑'}
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Victory Modal */}
                {winner && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 animate-bounce">
                            👑
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            {winner === 'red' ? 'Red Conquers the Board!' : 'Black Takes Victory!'}
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            Completed in {movesCount} moves.
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
