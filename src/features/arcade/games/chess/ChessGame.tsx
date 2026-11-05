import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { ChessEngine, ChessDifficulty } from './chessEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoPerson, IoHardwareChip } from 'react-icons/io5';

interface ChessProps {
    theme: GameTheme;
    onBack: () => void;
}

const PIECE_UNICODE: Record<string, string> = {
    'w-p': '♙',
    'w-n': '♘',
    'w-b': '♗',
    'w-r': '♖',
    'w-q': '♕',
    'w-k': '♔',
    'b-p': '♟',
    'b-n': '♞',
    'b-b': '♝',
    'b-r': '♜',
    'b-q': '♛',
    'b-k': '♚',
};

export const ChessGame: React.FC<ChessProps> = ({ theme, onBack }) => {
    const [game, setGame] = useState<Chess>(() => ChessEngine.createGame());
    const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
    const [difficulty, setDifficulty] = useState<ChessDifficulty>('medium');
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalDests, setLegalDests] = useState<Square[]>([]);
    const [movesCount, setMovesCount] = useState(0);
    const [bestMoves, setBestMoves] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isBotThinking, setIsBotThinking] = useState(false);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    useEffect(() => {
        getHighScore('vibe-chess', mode === 'ai' ? difficulty : 'pvp').then(setBestMoves);
    }, [mode, difficulty]);

    const resetGame = useCallback(() => {
        const newGame = ChessEngine.createGame();
        setGame(newGame);
        setSelectedSquare(null);
        setLegalDests([]);
        setMovesCount(0);
        setStatusMessage('');
        setIsBotThinking(false);
        setGameState('playing');
    }, [setGameState]);

    useEffect(() => {
        resetGame();
    }, [resetGame]);

    const board = useMemo(() => game.board(), [game]);
    const isGameOver = game.isGameOver();
    const turn = game.turn(); // 'w' or 'b'
    const isCheck = game.inCheck();

    // Sound effect trigger & status detection
    const handleMoveExecuted = useCallback(
        async (moveResult: Move) => {
            const nextMovesCount = movesCount + 1;
            setMovesCount(nextMovesCount);
            setSelectedSquare(null);
            setLegalDests([]);

            if (moveResult.captured) {
                arcadeAudio.playCollision();
            } else {
                arcadeAudio.playJump();
            }

            if (game.isCheckmate()) {
                const winnerColor = game.turn() === 'w' ? 'Black' : 'White';
                setStatusMessage(`Checkmate! ${winnerColor} wins!`);
                setGameState('completed');

                if (winnerColor === 'White') {
                    arcadeAudio.playMilestone();
                    if (mode === 'ai') {
                        await ArcadeLeaderboardService.submitScore({
                            gameId: 'vibe-chess',
                            metricType: 'moves',
                            score: nextMovesCount,
                            displayValue: `${nextMovesCount} Moves`,
                            difficulty,
                        });
                        const updated = await getHighScore('vibe-chess', difficulty);
                        setBestMoves(updated);
                    }
                } else {
                    arcadeAudio.playGameOver();
                }
            } else if (game.isDraw()) {
                if (game.isStalemate()) {
                    setStatusMessage('Stalemate! Game is a draw.');
                } else if (game.isThreefoldRepetition()) {
                    setStatusMessage('Draw by threefold repetition!');
                } else if (game.isInsufficientMaterial()) {
                    setStatusMessage('Draw by insufficient material!');
                } else {
                    setStatusMessage('Game drawn!');
                }
                setGameState('completed');
                arcadeAudio.playGameOver();
            } else if (game.inCheck()) {
                arcadeAudio.playCoin();
            }
        },
        [game, movesCount, mode, difficulty, setGameState]
    );

    // AI Bot Move Effect
    useEffect(() => {
        if (mode !== 'ai' || turn !== 'b' || gameState !== 'playing' || isGameOver) return;

        setIsBotThinking(true);
        const timer = setTimeout(() => {
            const botMove = ChessEngine.selectBotMove(game, difficulty);
            setIsBotThinking(false);

            if (botMove) {
                const applied = game.move(botMove);
                if (applied) {
                    setGame(new Chess(game.fen()));
                    handleMoveExecuted(applied);
                }
            }
        }, 400);

        return () => {
            clearTimeout(timer);
            setIsBotThinking(false);
        };
    }, [turn, mode, difficulty, game, gameState, isGameOver, handleMoveExecuted]);

    const handleSquareClick = (square: Square) => {
        if (gameState !== 'playing' || isGameOver) return;
        if (mode === 'ai' && (turn !== 'w' || isBotThinking)) return;

        const piece = game.get(square);

        // 1. If clicking own piece, select it and compute legal destination squares
        if (piece && piece.color === turn) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            setLegalDests(moves.map((m) => m.to));
            return;
        }

        // 2. If already selected a square and clicked a legal destination, make move
        if (selectedSquare) {
            try {
                // Default promotion to Queen for simplicity
                const moveResult = game.move({
                    from: selectedSquare,
                    to: square,
                    promotion: 'q',
                });

                if (moveResult) {
                    setGame(new Chess(game.fen()));
                    handleMoveExecuted(moveResult);
                } else {
                    setSelectedSquare(null);
                    setLegalDests([]);
                }
            } catch {
                setSelectedSquare(null);
                setLegalDests([]);
            }
        }
    };

    const captured = useMemo(() => ChessEngine.getCapturedPieces(game), [game]);

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    return (
        <ArcadeGameShell
            title="Vibe Chess"
            modeBadge={mode === 'ai' ? `VS BOT (${difficulty.toUpperCase()})` : 'PASS & PLAY'}
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
            <div className="w-full max-w-sm flex flex-col items-center justify-between space-y-2.5 p-1">
                {/* Mode & Difficulty Toggles */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                        onClick={() => {
                            setMode('ai');
                            resetGame();
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            mode === 'ai' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoHardwareChip size={13} /> Solo VS Bot
                    </button>
                    <button
                        onClick={() => {
                            setMode('pvp');
                            resetGame();
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            mode === 'pvp' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <IoPerson size={13} /> 2P Pass & Play
                    </button>

                    {mode === 'ai' && (
                        <div className="flex items-center gap-1 ml-1 pl-1 border-l border-white/10">
                            {(['easy', 'medium', 'hard'] as ChessDifficulty[]).map((diff) => (
                                <button
                                    key={diff}
                                    onClick={() => {
                                        setDifficulty(diff);
                                        resetGame();
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                        difficulty === diff
                                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status & Turn Banner */}
                <div className="flex items-center justify-between w-full px-2 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-3 h-3 rounded-full ${
                                turn === 'w' ? 'bg-white shadow-[0_0_8px_#ffffff]' : 'bg-gray-800 border border-white/40'
                            }`}
                        />
                        <span className={turn === 'w' ? 'text-white' : 'text-gray-300'}>
                            {turn === 'w' ? "White's Turn" + (mode === 'ai' ? ' (You)' : '') : "Black's Turn" + (mode === 'ai' ? ' (Bot)' : '')}
                        </span>
                    </div>

                    {isBotThinking && (
                        <span className="text-[11px] text-primary animate-pulse font-mono">
                            Thinking...
                        </span>
                    )}

                    {isCheck && !isGameOver && (
                        <span className="text-[11px] text-red-400 animate-pulse font-mono">
                            ⚠️ Check!
                        </span>
                    )}
                </div>

                {/* Captured Pieces Bar (Black's captures / White pieces lost) */}
                <div className="flex items-center justify-between w-full px-2 text-[11px] text-gray-400 h-5">
                    <div className="flex items-center gap-0.5">
                        {captured.white.map((p, i) => (
                            <span key={i} className="text-sm text-gray-300 opacity-80">{PIECE_UNICODE[`w-${p}`]}</span>
                        ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                        {captured.black.map((p, i) => (
                            <span key={i} className="text-sm text-white drop-shadow">{PIECE_UNICODE[`b-${p}`]}</span>
                        ))}
                    </div>
                </div>

                {/* 8x8 Chess Board */}
                <div className="relative border-4 border-amber-900/60 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-8 grid-rows-8 w-full max-w-[min(90vw,340px)] aspect-square bg-[#3b271d]">
                    {ranks.map((rank, rIdx) =>
                        files.map((file, cIdx) => {
                            const square = `${file}${rank}` as Square;
                            const piece = board[rIdx][cIdx];
                            const isDark = (rIdx + cIdx) % 2 === 1;
                            const isSelected = selectedSquare === square;
                            const isLegalDest = legalDests.includes(square);
                            const isCheckSquare = isCheck && piece?.type === 'k' && piece?.color === turn;

                            return (
                                <button
                                    key={square}
                                    disabled={(mode === 'ai' && turn !== 'w') || isGameOver}
                                    onClick={() => handleSquareClick(square)}
                                    className={`relative flex items-center justify-center transition-all cursor-pointer ${
                                        isDark ? 'bg-[#2b1810]' : 'bg-[#d6b896]'
                                    } ${isSelected ? 'ring-2 ring-amber-400 ring-inset bg-amber-900/40' : ''} ${
                                        isCheckSquare ? 'bg-red-700/80 ring-2 ring-red-400' : ''
                                    }`}
                                >
                                    {/* Legal move destination indicator */}
                                    {isLegalDest && (
                                        <div
                                            className={`rounded-full z-10 ${
                                                piece
                                                    ? 'w-full h-full border-2 border-emerald-400/90 animate-pulse'
                                                    : 'w-3 h-3 bg-emerald-400/90 shadow-[0_0_8px_#34d399] animate-pulse'
                                            }`}
                                        />
                                    )}

                                    {/* Piece */}
                                    {piece && (
                                        <span
                                            className={`text-2xl sm:text-3xl select-none transition-transform active:scale-110 ${
                                                piece.color === 'w'
                                                    ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                                    : 'text-zinc-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]'
                                            }`}
                                        >
                                            {PIECE_UNICODE[`${piece.color}-${piece.type}`]}
                                        </span>
                                    )}

                                    {/* Rank / File labels on edges */}
                                    {cIdx === 0 && (
                                        <span className="absolute top-0.5 left-0.5 text-[8px] font-bold text-gray-400/70 select-none">
                                            {rank}
                                        </span>
                                    )}
                                    {rIdx === 7 && (
                                        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-gray-400/70 select-none">
                                            {file}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Victory or Draw Modal */}
                {isGameOver && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 animate-bounce text-2xl">
                            ♔
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-1">
                            {statusMessage || 'Game Over'}
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
