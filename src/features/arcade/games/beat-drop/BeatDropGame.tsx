import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    BeatDropEngine,
    Piece,
    DROP_COLS,
    DROP_ROWS,
} from './beatDropEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoTrophy } from 'react-icons/io5';

interface BeatDropProps {
    theme: GameTheme;
    onBack: () => void;
}

export const BeatDropGame: React.FC<BeatDropProps> = ({ theme, onBack }) => {
    const [board, setBoard] = useState<(string | null)[][]>(BeatDropEngine.createEmptyBoard());
    const [currentPiece, setCurrentPiece] = useState<Piece>(BeatDropEngine.spawnPiece());
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack, initialState: 'playing' });

    const boardRef = useRef(board);
    boardRef.current = board;
    const pieceRef = useRef(currentPiece);
    pieceRef.current = currentPiece;

    useEffect(() => {
        getHighScore('beat-drop', 'normal').then(setHighScore);
    }, []);

    const resetGame = useCallback(() => {
        setBoard(BeatDropEngine.createEmptyBoard());
        setCurrentPiece(BeatDropEngine.spawnPiece());
        setScore(0);
        setLines(0);
        setGameState('playing');
    }, [setGameState]);

    const moveHorizontal = useCallback((dir: number) => {
        if (gameState !== 'playing') return;
        const p = pieceRef.current;
        if (!BeatDropEngine.collides(boardRef.current, p, dir, 0)) {
            setCurrentPiece({ ...p, x: p.x + dir });
        }
    }, [gameState]);

    const rotate = useCallback(() => {
        if (gameState !== 'playing') return;
        const p = pieceRef.current;
        const rotated = BeatDropEngine.rotateMatrix(p.matrix);
        const testPiece = { ...p, matrix: rotated };
        if (!BeatDropEngine.collides(boardRef.current, testPiece, 0, 0)) {
            arcadeAudio.playClick();
            setCurrentPiece(testPiece);
        }
    }, [gameState]);

    const drop = useCallback(() => {
        if (gameState !== 'playing') return;
        const p = pieceRef.current;
        const b = boardRef.current;

        if (!BeatDropEngine.collides(b, p, 0, 1)) {
            setCurrentPiece({ ...p, y: p.y + 1 });
        } else {
            // Lock piece
            const merged = BeatDropEngine.mergePiece(b, p);
            const { newBoard, linesCleared } = BeatDropEngine.clearLines(merged);
            setBoard(newBoard);

            if (linesCleared > 0) {
                arcadeAudio.playMilestone();
                const pts = [0, 100, 300, 500, 800][linesCleared] || 1000;
                setScore((s) => s + pts);
                setLines((l) => l + linesCleared);
            } else {
                arcadeAudio.playCardFlip();
            }

            // Spawn next
            const next = BeatDropEngine.spawnPiece();
            if (BeatDropEngine.collides(newBoard, next, 0, 0)) {
                // Game over
                arcadeAudio.playCollision();
                setGameState('completed');
                ArcadeLeaderboardService.submitScore({
                    gameId: 'beat-drop',
                    metricType: 'points',
                    score: score + (linesCleared > 0 ? 100 : 0),
                    displayValue: `${(score + (linesCleared > 0 ? 100 : 0)).toLocaleString()} pts`,
                    difficulty: 'normal',
                });
                getHighScore('beat-drop', 'normal').then(setHighScore);
            } else {
                setCurrentPiece(next);
            }
        }
    }, [gameState, score, setGameState]);

    const hardDrop = useCallback(() => {
        if (gameState !== 'playing') return;
        let testY = 0;
        const p = pieceRef.current;
        const b = boardRef.current;
        while (!BeatDropEngine.collides(b, p, 0, testY + 1)) {
            testY++;
        }
        setCurrentPiece({ ...p, y: p.y + testY });
        setTimeout(drop, 10);
    }, [gameState, drop]);

    // Tick loop
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(drop, 750);
        return () => clearInterval(interval);
    }, [gameState, drop]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') moveHorizontal(-1);
            else if (e.key === 'ArrowRight') moveHorizontal(1);
            else if (e.key === 'ArrowUp') rotate();
            else if (e.key === 'ArrowDown') drop();
            else if (e.key === ' ') {
                e.preventDefault();
                hardDrop();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveHorizontal, rotate, drop, hardDrop]);

    // Compute display grid including falling piece
    const displayBoard = board.map((row) => [...row]);
    if (gameState === 'playing' || gameState === 'paused') {
        for (let r = 0; r < currentPiece.matrix.length; r++) {
            for (let c = 0; c < currentPiece.matrix[r].length; c++) {
                if (currentPiece.matrix[r][c]) {
                    const ny = currentPiece.y + r;
                    const nx = currentPiece.x + c;
                    if (ny >= 0 && ny < DROP_ROWS && nx >= 0 && nx < DROP_COLS) {
                        displayBoard[ny][nx] = currentPiece.color;
                    }
                }
            }
        }
    }

    return (
        <ArcadeGameShell
            title="Beat Drop"
            modeBadge={`LINES ${lines}`}
            scoreDisplay={`Score: ${score.toLocaleString()}`}
            highScoreDisplay={highScore > 0 ? `Best: ${highScore.toLocaleString()}` : undefined}
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
                {/* Board */}
                <div className="relative border-2 border-white/20 rounded-2xl overflow-hidden bg-black/90 shadow-2xl p-2 w-full max-w-[280px]">
                    <div
                        className="grid gap-[1px] bg-white/5 rounded-xl overflow-hidden p-1"
                        style={{
                            gridTemplateColumns: `repeat(${DROP_COLS}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${DROP_ROWS}, minmax(0, 1fr))`,
                        }}
                    >
                        {displayBoard.map((row, r) =>
                            row.map((cell, c) => (
                                <div
                                    key={`${r}-${c}`}
                                    className="aspect-square rounded-[2px] transition-colors duration-75"
                                    style={{
                                        backgroundColor: cell || 'rgba(255, 255, 255, 0.03)',
                                        boxShadow: cell ? `0 0 6px ${cell}` : 'none',
                                    }}
                                />
                            ))
                        )}
                    </div>

                    {/* Game Over Modal */}
                    {gameState === 'completed' && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                            <div className="w-16 h-16 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mb-3 animate-bounce">
                                <IoTrophy size={36} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                                Stack Overflow!
                            </h3>
                            <p className="text-xs text-gray-300 mb-4">
                                Final Score: {score.toLocaleString()} pts ({lines} lines)
                            </p>
                            <button
                                onClick={resetGame}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <IoRefresh size={16} /> Drop Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Touch Controls */}
                <div className="w-full grid grid-cols-4 gap-2 pt-1 max-w-[320px]">
                    <button
                        onClick={() => moveHorizontal(-1)}
                        className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-lg rounded-xl flex items-center justify-center cursor-pointer"
                    >
                        ◀
                    </button>
                    <button
                        onClick={rotate}
                        className="py-3 bg-cyan-500/30 border border-cyan-400/50 hover:bg-cyan-500/40 active:scale-95 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer"
                    >
                        ROTATE
                    </button>
                    <button
                        onClick={drop}
                        className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-lg rounded-xl flex items-center justify-center cursor-pointer"
                    >
                        ▼
                    </button>
                    <button
                        onClick={() => moveHorizontal(1)}
                        className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-lg rounded-xl flex items-center justify-center cursor-pointer"
                    >
                        ▶
                    </button>
                </div>
            </div>
        </ArcadeGameShell>
    );
};
