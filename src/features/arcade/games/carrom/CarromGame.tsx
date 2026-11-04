import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import {
    CarromEngine,
    CarromPiece,
    CARROM_BOARD_SIZE,
    CARROM_POCKETS,
} from './carromEngine';
import { ArcadeLeaderboardService } from '../../services/arcadeLeaderboardService';
import { getHighScore } from '../../services/arcadeStorage';
import { ArcadeGameShell } from '../../components/ArcadeGameShell';
import { useArcadeGameLifecycle } from '../../hooks/useArcadeGameLifecycle';
import { IoRefresh, IoSparkles, IoTrophy } from 'react-icons/io5';

interface CarromProps {
    theme: GameTheme;
    onBack: () => void;
}

export const CarromGame: React.FC<CarromProps> = ({ theme, onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [pieces, setPieces] = useState<CarromPiece[]>(() => CarromEngine.createInitialPieces());
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [shotsRemaining, setShotsRemaining] = useState(10);
    const [queenCoverPending, setQueenCoverPending] = useState(false);
    const [isAiming, setIsAiming] = useState(false);
    const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
    const [power, setPower] = useState(0.5); // 0.1 .. 1.0
    const [isMoving, setIsMoving] = useState(false);
    const [foulMessage, setFoulMessage] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);

    const piecesRef = useRef<CarromPiece[]>(pieces);
    piecesRef.current = pieces;

    const {
        gameState,
        setGameState,
        showExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    } = useArcadeGameLifecycle({ onBack });

    useEffect(() => {
        getHighScore('carrom-disc', 'challenge').then(setBestScore);
    }, []);

    const resetGame = useCallback(() => {
        const initial = CarromEngine.createInitialPieces();
        setPieces(initial);
        setScore(0);
        setShotsRemaining(10);
        setQueenCoverPending(false);
        setIsAiming(false);
        setIsMoving(false);
        setFoulMessage(null);
        setGameState('playing');
    }, [setGameState]);

    // Continuous physics animation loop
    useEffect(() => {
        let animId: number;

        const loop = () => {
            if (isMoving && gameState === 'playing') {
                const current = piecesRef.current.map((p) => ({ ...p }));
                const { pieces: next, pocketedPieces, allStationary } = CarromEngine.updatePhysics(current);

                if (pocketedPieces.length > 0) {
                    arcadeAudio.playCollect();

                    const outcome = CarromEngine.calculateScore(pocketedPieces, queenCoverPending);
                    setScore((s) => Math.max(0, s + outcome.points));

                    if (outcome.foul) {
                        arcadeAudio.playCollision();
                        setFoulMessage('Striker Pocketed (-10 pts foul)!');
                        setTimeout(() => setFoulMessage(null), 2000);
                    }

                    if (outcome.queenPocketed) {
                        setQueenCoverPending(true);
                    } else if (outcome.queenCovered) {
                        setQueenCoverPending(false);
                    }
                }

                setPieces(next);

                if (allStationary) {
                    setIsMoving(false);
                    // Reset striker to baseline
                    setPieces((p) => CarromEngine.resetStriker(p));

                    // Check end of round
                    setShotsRemaining((prev) => {
                        const nextShots = prev - 1;
                        if (nextShots <= 0) {
                            handleGameOver(score);
                        }
                        return nextShots;
                    });
                }
            }

            drawBoard();
            animId = requestAnimationFrame(loop);
        };

        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isMoving, gameState, queenCoverPending, score]);

    const handleGameOver = async (finalScore: number) => {
        setGameState('completed');
        arcadeAudio.playMilestone();

        await ArcadeLeaderboardService.submitScore({
            gameId: 'carrom-disc',
            metricType: 'points',
            score: finalScore,
            displayValue: `${finalScore} pts`,
            difficulty: 'challenge',
        });

        const updated = await getHighScore('carrom-disc', 'challenge');
        setBestScore(updated);
    };

    const drawBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, CARROM_BOARD_SIZE, CARROM_BOARD_SIZE);

        // Wooden Carrom Board Surface
        ctx.fillStyle = '#fef3c7'; // Light cream wood
        ctx.fillRect(0, 0, CARROM_BOARD_SIZE, CARROM_BOARD_SIZE);

        // Wooden Borders / Cushions
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#78350f';
        ctx.strokeRect(7, 7, CARROM_BOARD_SIZE - 14, CARROM_BOARD_SIZE - 14);

        // Center concentric circles
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(CARROM_BOARD_SIZE / 2, CARROM_BOARD_SIZE / 2, 45, 0, Math.PI * 2);
        ctx.stroke();

        // Baseline (Player striker placement zone)
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        const baselineY = CARROM_BOARD_SIZE - 75;
        ctx.beginPath();
        ctx.moveTo(85, baselineY);
        ctx.lineTo(CARROM_BOARD_SIZE - 85, baselineY);
        ctx.stroke();

        // 4 Corner Pockets
        for (const pocket of CARROM_POCKETS) {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#334155';
            ctx.stroke();
        }

        // Draw Pieces
        for (const p of piecesRef.current) {
            if (p.isPocketed) continue;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 3;

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = p.type === 'white' ? '#cbd5e1' : p.type === 'queen' ? '#b91c1c' : '#0f172a';
            ctx.stroke();
            ctx.restore();

            // Striker center dot
            if (p.type === 'striker') {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Aiming Guide Line if aiming
        const striker = piecesRef.current.find((p) => p.type === 'striker');
        if (striker && !isMoving && !striker.isPocketed) {
            ctx.save();
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);

            const lineLen = 60 + power * 90;
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);
            ctx.lineTo(
                striker.x + Math.cos(aimAngle) * lineLen,
                striker.y + Math.sin(aimAngle) * lineLen
            );
            ctx.stroke();
            ctx.restore();
        }
    };

    const handleFire = () => {
        if (isMoving || gameState !== 'playing') return;
        const striker = pieces.find((p) => p.type === 'striker');
        if (!striker) return;

        CarromEngine.fireStriker(striker, aimAngle, power);
        arcadeAudio.playJump();
        setIsMoving(true);
    };

    return (
        <ArcadeGameShell
            title="Carrom Disc Challenge"
            modeBadge="CHALLENGE (10 SHOTS)"
            scoreDisplay={`${score} pts`}
            highScoreDisplay={bestScore > 0 ? `Best: ${bestScore} pts` : undefined}
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
                {/* HUD: Shots remaining & Queen status */}
                <div className="w-full flex items-center justify-between px-2 text-xs font-bold">
                    <span className="text-gray-300">
                        🎯 Shots: <span className="text-white font-mono">{shotsRemaining}</span>/10
                    </span>

                    {queenCoverPending ? (
                        <span className="text-red-400 animate-pulse flex items-center gap-1">
                            <IoSparkles /> Cover Queen! (+25)
                        </span>
                    ) : (
                        <span className="text-gray-400">White: 10pts | Black: 5pts</span>
                    )}
                </div>

                {/* Foul Banner */}
                {foulMessage && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 px-3 py-1 rounded-xl text-xs font-bold animate-bounce">
                        {foulMessage}
                    </div>
                )}

                {/* 2D Canvas Carrom Board */}
                <div className="relative border-4 border-amber-950 rounded-3xl overflow-hidden shadow-2xl bg-amber-900 w-full max-w-[min(90vw,340px)] aspect-square flex items-center justify-center">
                    <canvas
                        ref={canvasRef}
                        width={CARROM_BOARD_SIZE}
                        height={CARROM_BOARD_SIZE}
                        className="w-full h-full touch-none select-none"
                    />
                </div>

                {/* Controls: Aim Angle, Power Slider & Flick Button */}
                <div className="w-full flex flex-col gap-2 bg-white/5 border border-white/10 rounded-2xl p-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-400 font-bold">Angle</span>
                        <input
                            type="range"
                            min={-Math.PI}
                            max={0}
                            step={0.02}
                            value={aimAngle}
                            disabled={isMoving}
                            onChange={(e) => setAimAngle(parseFloat(e.target.value))}
                            className="w-full accent-cyan-400 cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-400 font-bold">Power</span>
                        <input
                            type="range"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={power}
                            disabled={isMoving}
                            onChange={(e) => setPower(parseFloat(e.target.value))}
                            className="w-full accent-primary cursor-pointer"
                        />
                    </div>

                    <button
                        disabled={isMoving || gameState !== 'playing'}
                        onClick={handleFire}
                        className={`w-full py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${
                            !isMoving
                                ? 'bg-primary hover:bg-red-600 text-white cursor-pointer active:scale-95'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {isMoving ? 'Discs Rolling...' : 'Flick Striker! 🚀'}
                    </button>
                </div>

                {/* End of Challenge Modal */}
                {gameState === 'completed' && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 animate-bounce">
                            <IoTrophy size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                            Challenge Complete!
                        </h3>
                        <p className="text-xs text-gray-300 mb-4">
                            You scored <span className="font-bold text-white">{score} points</span>.
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
