import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameTheme } from '../../types';
import { arcadeAudio } from '../../services/arcadeAudio';
import { DialogueEngine } from '../../engine/dialogueEngine';
import { saveGameScore, getHighScore } from '../../services/arcadeStorage';
import { IoPlay, IoRefresh, IoArrowBack, IoVolumeHigh, IoVolumeMute, IoPause, IoPlayOutline } from 'react-icons/io5';
import { useAppSelector } from '../../../../hooks/redux';
import { extractImageUrl } from '../../../../utils/imageUtils';
import { decodeHtmlEntities } from '../../../../utils/decodeHtml';

interface FlappyStarProps {
    theme: GameTheme;
    dialogueEnabled: boolean;
    dialogueLanguage: 'auto' | 'english' | 'telugu' | 'hindi';
    songLanguage?: string;
    onBack: () => void;
}

interface ObstaclePair {
    x: number;
    topHeight: number;
    bottomHeight: number;
    passed: boolean;
    style: 'speaker' | 'mic-stand' | 'amplifier' | 'stage-light';
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    life: number;
    shape?: 'circle' | 'note' | 'spark';
}

export const FlappyStar: React.FC<FlappyStarProps> = ({
    theme: initialTheme,
    dialogueEnabled,
    dialogueLanguage,
    songLanguage,
    onBack,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Keep live track of current song for Now Playing indicator and queued round transitions
    const { currentSong } = useAppSelector((state) => state.musicPlayer);

    // Active round snapshot: freezes artist photo, song title, and colors during active gameplay
    const [roundSnapshot, setRoundSnapshot] = useState<{
        theme: GameTheme;
        artistPhoto?: string;
        songTitle: string;
        artistName: string;
        artworkUrl?: string;
    }>(() => ({
        theme: initialTheme,
        artistPhoto: initialTheme.artistImageUrl,
        songTitle: currentSong?.name || 'Vibe On Arcade',
        artistName: typeof currentSong?.primaryArtists === 'string' ? currentSong.primaryArtists : 'Featured Artist',
        artworkUrl: initialTheme.albumArtworkUrl,
    }));

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
    const [speech, setSpeech] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [canRestart, setCanRestart] = useState(false);

    // Virtual canvas resolution
    const CANVAS_WIDTH = 360;
    const CANVAS_HEIGHT = 640;
    const PIPE_WIDTH = 58;
    const PIPE_GAP = 145;
    const GRAVITY = 0.34;
    const FLAP_STRENGTH = -6.8;

    // Flight physics & state refs
    const birdYRef = useRef(260);
    const birdVelocityRef = useRef(0);
    const birdRotationRef = useRef(0);
    const obstaclesRef = useRef<ObstaclePair[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const scoreRef = useRef(0);
    const frameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const artistImgElementRef = useRef<HTMLImageElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Preload artist image safely
    useEffect(() => {
        if (!roundSnapshot.artistPhoto) {
            artistImgElementRef.current = null;
            setImageLoaded(false);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = roundSnapshot.artistPhoto;
        img.onload = () => {
            artistImgElementRef.current = img;
            setImageLoaded(true);
        };
        img.onerror = () => {
            artistImgElementRef.current = null;
            setImageLoaded(false);
        };
    }, [roundSnapshot.artistPhoto]);

    // Load persisted high score on mount
    useEffect(() => {
        getHighScore('flappy-star').then(setHighScore);
    }, []);

    const showDialogue = useCallback((trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score') => {
        if (!dialogueEnabled) return;
        const msg = DialogueEngine.getRandomDialogue(trigger, dialogueLanguage, songLanguage);
        setSpeech(msg);
        setTimeout(() => setSpeech(null), 3200);
    }, [dialogueEnabled, dialogueLanguage, songLanguage]);

    const spawnParticles = (x: number, y: number, color: string, count = 10, shape: 'circle' | 'note' | 'spark' = 'circle') => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color,
                alpha: 1,
                life: 1,
                shape,
            });
        }
    };

    const flap = useCallback(() => {
        if (gameState === 'idle') {
            startGame();
            return;
        }
        if (gameState === 'gameover') {
            if (canRestart) startGame();
            return;
        }
        if (gameState === 'paused') {
            return;
        }
        birdVelocityRef.current = FLAP_STRENGTH;
        arcadeAudio.playJump();

        // Spawn gentle propulsion note particles
        spawnParticles(85, birdYRef.current + 8, roundSnapshot.theme.colors.accent, 4, 'note');
    }, [gameState, canRestart, roundSnapshot]);

    const togglePause = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (gameState === 'playing') {
            setGameState('paused');
        } else if (gameState === 'paused') {
            setGameState('playing');
        }
    };

    const startGame = () => {
        // Capture new round snapshot from current song state if updated
        const activeArtwork = currentSong ? extractImageUrl(currentSong as any, '500x500') : initialTheme.albumArtworkUrl;
        const activeArtist = (currentSong as any)?.artistImage || (currentSong as any)?.artist_image || initialTheme.artistImageUrl;

        setRoundSnapshot({
            theme: initialTheme,
            artistPhoto: activeArtist,
            songTitle: currentSong?.name || 'Vibe On Arcade',
            artistName: typeof currentSong?.primaryArtists === 'string' ? currentSong.primaryArtists : 'Featured Artist',
            artworkUrl: activeArtwork,
        });

        birdYRef.current = 260;
        birdVelocityRef.current = 0;
        birdRotationRef.current = 0;
        particlesRef.current = [];

        obstaclesRef.current = [
            {
                x: CANVAS_WIDTH + 60,
                topHeight: 160,
                bottomHeight: CANVAS_HEIGHT - 160 - PIPE_GAP,
                passed: false,
                style: 'speaker',
            },
        ];

        scoreRef.current = 0;
        setScore(0);
        setCanRestart(false);
        setGameState('playing');
        showDialogue('start');
    };

    const endGame = async () => {
        setGameState('gameover');
        if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        arcadeAudio.playCollision();

        // Spawn collision burst particles
        spawnParticles(85, birdYRef.current, '#ef4444', 24, 'spark');

        // Prevent accidental instant restart
        setTimeout(() => setCanRestart(true), 400);

        const { isNewHighScore, highScore: newHigh } = await saveGameScore('flappy-star', scoreRef.current);
        setHighScore(newHigh);

        if (isNewHighScore && scoreRef.current > 0) {
            showDialogue('new-high-score');
            arcadeAudio.playMilestone();
        } else {
            showDialogue('game-over');
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                flap();
            } else if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                togglePause();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [flap, gameState]);

    // Canvas rendering loop
    useEffect(() => {
        if (gameState !== 'playing') {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let lastTime = performance.now();

        const loop = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.05); // Cap delta time
            lastTime = time;

            // 1. Physics update
            birdVelocityRef.current += GRAVITY;
            birdYRef.current += birdVelocityRef.current;

            // Target smooth rotation (-25 deg on upflap to +40 deg on nose fall)
            const targetRotation = Math.max(-0.45, Math.min(0.7, birdVelocityRef.current * 0.09));
            birdRotationRef.current += (targetRotation - birdRotationRef.current) * 0.22;

            // Boundary collision
            if (birdYRef.current >= CANVAS_HEIGHT - 26) {
                endGame();
                return;
            }
            if (birdYRef.current < 20) {
                birdYRef.current = 20;
                birdVelocityRef.current = 0;
            }

            // 2. Obstacles update
            const currentSpeed = 2.4 + Math.min(scoreRef.current * 0.04, 1.2); // Graceful capped difficulty
            const obstacles = obstaclesRef.current;

            for (let i = 0; i < obstacles.length; i++) {
                obstacles[i].x -= currentSpeed;

                // Score check
                if (!obstacles[i].passed && obstacles[i].x + PIPE_WIDTH < 85) {
                    obstacles[i].passed = true;
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                    arcadeAudio.playCollect();

                    // Score milestone
                    spawnParticles(obstacles[i].x + PIPE_WIDTH, 200, roundSnapshot.theme.colors.accent, 8, 'note');

                    if (scoreRef.current % 10 === 0) {
                        showDialogue('milestone');
                        arcadeAudio.playMilestone();
                    }
                }

                // Fair collision box: slightly smaller than visible character radius (18px vs 22px frame)
                const charBox = {
                    left: 85 - 15,
                    right: 85 + 15,
                    top: birdYRef.current - 15,
                    bottom: birdYRef.current + 15,
                };

                const obs = obstacles[i];
                if (charBox.right > obs.x && charBox.left < obs.x + PIPE_WIDTH) {
                    if (charBox.top < obs.topHeight || charBox.bottom > CANVAS_HEIGHT - obs.bottomHeight) {
                        endGame();
                        return;
                    }
                }
            }

            // Remove offscreen obstacles
            if (obstacles.length > 0 && obstacles[0].x < -PIPE_WIDTH - 20) {
                obstacles.shift();
            }

            // Spawn next obstacle with music equipment variation
            const lastObs = obstacles[obstacles.length - 1];
            if (lastObs && lastObs.x < CANVAS_WIDTH - 180) {
                const styles: ('speaker' | 'mic-stand' | 'amplifier' | 'stage-light')[] = [
                    'speaker',
                    'amplifier',
                    'stage-light',
                    'mic-stand',
                ];
                const selectedStyle = styles[Math.floor(Math.random() * styles.length)];
                const topHeight = Math.floor(Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 180)) + 80;

                obstacles.push({
                    x: CANVAS_WIDTH,
                    topHeight,
                    bottomHeight: CANVAS_HEIGHT - topHeight - PIPE_GAP,
                    passed: false,
                    style: selectedStyle,
                });
            }

            // 3. Update Particles
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.025;
                if (p.alpha <= 0) {
                    particlesRef.current.splice(i, 1);
                }
            }

            // 4. Render Background
            ctx.fillStyle = roundSnapshot.theme.colors.background;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Subtle scanlines
            ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
            for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
                ctx.fillRect(0, y, CANVAS_WIDTH, 1);
            }

            // Stage backdrop silhouette / equalizers
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            for (let x = 0; x < CANVAS_WIDTH; x += 18) {
                const barH = 30 + Math.sin((time * 0.003) + x) * 20;
                ctx.fillRect(x, CANVAS_HEIGHT - barH, 12, barH);
            }

            // 5. Render Music-Themed Obstacles
            obstacles.forEach((obs) => {
                const accent = roundSnapshot.theme.colors.accent;
                const obsColor = roundSnapshot.theme.colors.obstacle;
                const secAccent = roundSnapshot.theme.colors.secondaryAccent;

                // TOP OBSTACLE
                ctx.fillStyle = obsColor;
                ctx.fillRect(obs.x, 0, PIPE_WIDTH, obs.topHeight);

                // Top Cap / Trim
                ctx.fillStyle = accent;
                ctx.fillRect(obs.x - 3, obs.topHeight - 16, PIPE_WIDTH + 6, 16);

                // Equipment Details (Top)
                if (obs.style === 'speaker' && obs.topHeight > 70) {
                    ctx.fillStyle = secAccent;
                    ctx.beginPath();
                    ctx.arc(obs.x + PIPE_WIDTH / 2, obs.topHeight / 2, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = accent;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obs.style === 'amplifier') {
                    ctx.fillStyle = '#1e1e24';
                    ctx.fillRect(obs.x + 8, obs.topHeight - 45, PIPE_WIDTH - 16, 20);
                    ctx.fillStyle = accent;
                    ctx.fillRect(obs.x + 12, obs.topHeight - 38, 4, 4);
                    ctx.fillRect(obs.x + 22, obs.topHeight - 38, 4, 4);
                } else if (obs.style === 'stage-light') {
                    ctx.fillStyle = accent;
                    ctx.beginPath();
                    ctx.arc(obs.x + PIPE_WIDTH / 2, obs.topHeight - 24, 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                // BOTTOM OBSTACLE
                const bottomY = CANVAS_HEIGHT - obs.bottomHeight;
                ctx.fillStyle = obsColor;
                ctx.fillRect(obs.x, bottomY, PIPE_WIDTH, obs.bottomHeight);

                // Bottom Cap / Trim
                ctx.fillStyle = accent;
                ctx.fillRect(obs.x - 3, bottomY, PIPE_WIDTH + 6, 16);

                // Equipment Details (Bottom)
                if (obs.style === 'speaker' && obs.bottomHeight > 70) {
                    ctx.fillStyle = secAccent;
                    ctx.beginPath();
                    ctx.arc(obs.x + PIPE_WIDTH / 2, bottomY + obs.bottomHeight / 2, 14, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = accent;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obs.style === 'amplifier') {
                    ctx.fillStyle = '#1e1e24';
                    ctx.fillRect(obs.x + 8, bottomY + 25, PIPE_WIDTH - 16, 20);
                    ctx.fillStyle = accent;
                    ctx.fillRect(obs.x + 12, bottomY + 32, 4, 4);
                    ctx.fillRect(obs.x + 22, bottomY + 32, 4, 4);
                } else if (obs.style === 'stage-light') {
                    ctx.fillStyle = accent;
                    ctx.beginPath();
                    ctx.arc(obs.x + PIPE_WIDTH / 2, bottomY + 28, 10, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 6. Render Particles
            particlesRef.current.forEach((p) => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                if (p.shape === 'note') {
                    ctx.font = `${p.size * 3}px monospace`;
                    ctx.fillText('♪', p.x, p.y);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });

            // 7. Render Player Character (Artist Photo or Pixel Music Note)
            const charX = 85;
            const charY = birdYRef.current;
            const radius = 20;

            ctx.save();
            ctx.translate(charX, charY);
            ctx.rotate(birdRotationRef.current);

            // Glow around character
            ctx.shadowColor = roundSnapshot.theme.colors.accent;
            ctx.shadowBlur = 14;

            if (artistImgElementRef.current && imageLoaded) {
                // Circular artist photo with neon pixel border
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // Draw preloaded artist image
                ctx.drawImage(
                    artistImgElementRef.current,
                    -radius,
                    -radius,
                    radius * 2,
                    radius * 2
                );

                // Reset clipping for border
                ctx.restore();
                ctx.save();
                ctx.translate(charX, charY);
                ctx.rotate(birdRotationRef.current);

                // Pixel-art frame ring
                ctx.strokeStyle = roundSnapshot.theme.colors.accent;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, radius + 1, 0, Math.PI * 2);
                ctx.stroke();

                // Small shiny highlight in top-left
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(-radius + 6, -radius + 6, 4, 4);
            } else {
                // Fallback: Glowing Pixel-Art Music Note (♪)
                ctx.fillStyle = roundSnapshot.theme.colors.character;

                // Head
                ctx.beginPath();
                ctx.ellipse(-4, 6, 9, 7, -0.3, 0, Math.PI * 2);
                ctx.fill();

                // Stem
                ctx.fillRect(3, -12, 4, 18);

                // Flag
                ctx.beginPath();
                ctx.moveTo(7, -12);
                ctx.bezierCurveTo(16, -10, 15, -2, 8, 2);
                ctx.lineTo(7, 0);
                ctx.bezierCurveTo(12, -4, 12, -8, 7, -10);
                ctx.closePath();
                ctx.fill();

                // Pixel-art highlight
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-6, 3, 3, 3);
            }

            ctx.restore();

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);
        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [gameState, roundSnapshot, imageLoaded]);

    return (
        <div
            onClick={flap}
            className="fixed inset-0 z-[400] md:relative md:inset-auto flex flex-col items-center justify-center select-none bg-black md:bg-transparent touch-none h-[100dvh] w-full max-w-full overflow-hidden"
        >
            {/* Top Bar / HUD */}
            <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                    className="pointer-events-auto p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all"
                    aria-label="Back to Arcade"
                >
                    <IoArrowBack size={20} />
                </button>

                {/* Live Score Counter */}
                <div className="flex flex-col items-center pointer-events-none">
                    <span className="text-4xl sm:text-5xl font-black text-white font-mono drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                        {score}
                    </span>
                    {highScore > 0 && (
                        <span className="text-[11px] font-bold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            Best: {highScore}
                        </span>
                    )}
                </div>

                {/* Controls (Pause & Audio SFX) */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {gameState === 'playing' && (
                        <button
                            onClick={togglePause}
                            className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all"
                            aria-label="Pause Game"
                        >
                            <IoPause size={18} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = !isMuted;
                            setIsMuted(next);
                            arcadeAudio.setEnabled(!next);
                        }}
                        className={`p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full border border-white/15 shadow-xl active:scale-95 transition-all ${
                            !isMuted ? 'text-primary' : 'text-gray-400'
                        }`}
                        aria-label="Toggle Sound Effects"
                    >
                        {isMuted ? <IoVolumeMute size={18} /> : <IoVolumeHigh size={18} />}
                    </button>
                </div>
            </div>

            {/* Compact Now Playing Banner (Non-intrusive) */}
            <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 max-w-sm truncate shadow-lg">
                    {currentSong?.image && (
                        <img
                            src={extractImageUrl(currentSong as any, '150x150')}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/20"
                        />
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] truncate">
                        <span className="font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                            {currentSong?.name || 'Vibe On Music'}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400 truncate max-w-[100px]">
                            {decodeHtmlEntities(typeof currentSong?.primaryArtists === 'string' ? currentSong.primaryArtists : '')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Canvas Container */}
            <div
                className="relative w-full h-full md:max-w-[min(92vw,400px)] md:aspect-[9/16] md:rounded-3xl overflow-hidden border-0 md:border-2 shadow-2xl flex items-center justify-center bg-black"
                style={{ borderColor: roundSnapshot.theme.colors.accent }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="w-full h-full object-cover md:object-contain block"
                />

                {/* Speech Bubble Reaction */}
                {speech && (
                    <div className="absolute top-20 left-6 right-6 z-30 bg-white/95 text-gray-900 font-bold text-xs p-3 rounded-2xl shadow-2xl border-2 border-primary animate-bounce text-center backdrop-blur-md pointer-events-none">
                        "{speech}"
                    </div>
                )}

                {/* 1. INTRO / START SCREEN */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                        {roundSnapshot.artistPhoto ? (
                            <div className="relative mb-3">
                                <img
                                    src={roundSnapshot.artistPhoto}
                                    alt="Artist"
                                    className="w-20 h-20 rounded-full object-cover border-4 shadow-2xl animate-pulse"
                                    style={{ borderColor: roundSnapshot.theme.colors.accent }}
                                />
                                <span className="absolute -bottom-1 -right-1 text-base bg-black/80 px-1.5 py-0.5 rounded-full border border-white/20">
                                    🎤
                                </span>
                            </div>
                        ) : (
                            <div className="w-18 h-18 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-4xl mb-3 text-primary animate-bounce">
                                ♪
                            </div>
                        )}

                        <h2 className="text-3xl sm:text-4xl font-black mb-1 text-white font-mono uppercase tracking-wider">
                            Flappy Star
                        </h2>
                        <p className="text-xs text-primary font-bold mb-1 max-w-xs truncate">
                            {roundSnapshot.artistName}
                        </p>
                        <p className="text-[11px] text-gray-300 mb-6 max-w-xs">
                            Tap anywhere on screen to fly past music stage towers!
                        </p>

                        <button
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="min-h-[50px] px-8 py-3.5 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/40 transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                        >
                            <IoPlay size={20} /> Tap To Play
                        </button>
                    </div>
                )}

                {/* 2. PAUSE SCREEN */}
                {gameState === 'paused' && (
                    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                        <h3 className="text-2xl sm:text-3xl font-black mb-2 text-white font-mono uppercase tracking-wider">
                            Game Paused
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">Current Score: {score}</p>
                        <div className="flex flex-col gap-3 w-56">
                            <button
                                onClick={togglePause}
                                className="min-h-[46px] px-6 py-3 bg-primary hover:bg-red-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <IoPlayOutline size={18} /> Resume
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); startGame(); }}
                                className="min-h-[46px] px-6 py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/10 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <IoRefresh size={18} /> Restart
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onBack(); }}
                                className="min-h-[46px] px-6 py-3 bg-transparent hover:bg-white/5 active:scale-95 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider"
                            >
                                Exit to Arcade
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. GAME OVER SCREEN */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-4xl mb-1">💥</span>
                        <h3 className="text-2xl sm:text-3xl font-black text-red-500 mb-1 uppercase tracking-wider font-mono">
                            Stage Cleared!
                        </h3>

                        {speech && (
                            <p className="text-xs text-amber-300 font-bold max-w-xs mb-2">
                                "{speech}"
                            </p>
                        )}

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-3 w-52 space-y-1.5 shadow-xl">
                            <p className="text-xs text-gray-400">Score: <span className="text-white font-black font-mono text-lg">{score}</span></p>
                            <p className="text-xs text-gray-400">Best: <span className="text-amber-400 font-black font-mono text-lg">{highScore}</span></p>
                        </div>

                        <div className="flex flex-col gap-2.5 w-52">
                            <button
                                disabled={!canRestart}
                                onClick={(e) => { e.stopPropagation(); startGame(); }}
                                className="min-h-[48px] px-6 py-3 bg-primary hover:bg-red-600 disabled:opacity-40 active:scale-95 text-white font-black text-xs rounded-xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                            >
                                <IoRefresh size={20} /> Play Again
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onBack(); }}
                                className="min-h-[42px] px-6 py-2.5 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
