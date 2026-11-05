import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../hooks/redux';
import { SongThemeEngine } from '../engine/songThemeEngine';
import { ArcadeGameId, ArcadeSettings } from '../types';
import { getArcadeSettings } from '../services/arcadeStorage';
import { NowPlayingMini } from '../components/NowPlayingMini';

// Lazy load individual game components with code splitting to keep initial bundle lean
const SingerSnake = lazy(() => import('../games/snake/SingerSnake').then((m) => ({ default: m.SingerSnake })));
const FlappyStar = lazy(() => import('../games/flappy-bird/FlappyStar').then((m) => ({ default: m.FlappyStar })));
const VibeRunner = lazy(() => import('../games/dino-runner/VibeRunner').then((m) => ({ default: m.VibeRunner })));

// Batch 1 Games: LinkedIn & Daily Mind Puzzles
const QueensGame = lazy(() => import('../games/queens/QueensGame').then((m) => ({ default: m.QueensGame })));
const TangoGame = lazy(() => import('../games/tango/TangoGame').then((m) => ({ default: m.TangoGame })));
const PinpointGame = lazy(() => import('../games/pinpoint/PinpointGame').then((m) => ({ default: m.PinpointGame })));
const CrossclimbGame = lazy(() => import('../games/crossclimb/CrossclimbGame').then((m) => ({ default: m.CrossclimbGame })));
const WordleGame = lazy(() => import('../games/wordle/WordleGame').then((m) => ({ default: m.WordleGame })));

// Batch 2 Games: Numbers & Logic Masters
const Game2048 = lazy(() => import('../games/game2048/Game2048').then((m) => ({ default: m.Game2048 })));
const SudokuGame = lazy(() => import('../games/sudoku/SudokuGame').then((m) => ({ default: m.SudokuGame })));
const SoundSweeperGame = lazy(() => import('../games/sound-sweeper/SoundSweeperGame').then((m) => ({ default: m.SoundSweeperGame })));
const PicrossGame = lazy(() => import('../games/picross/PicrossGame').then((m) => ({ default: m.PicrossGame })));
const SlidePuzzleGame = lazy(() => import('../games/slide-puzzle/SlidePuzzleGame').then((m) => ({ default: m.SlidePuzzleGame })));

// Batch 3 Games: Classic Board & Tabletop
const LudoGame = lazy(() => import('../games/ludo/LudoGame').then((m) => ({ default: m.LudoGame })));
const TicTacToeGame = lazy(() => import('../games/tic-tac-toe/TicTacToeGame').then((m) => ({ default: m.TicTacToeGame })));
const ConnectFourGame = lazy(() => import('../games/connect-four/ConnectFourGame').then((m) => ({ default: m.ConnectFourGame })));
const CheckersGame = lazy(() => import('../games/checkers/CheckersGame').then((m) => ({ default: m.CheckersGame })));
const ChessGame = lazy(() => import('../games/chess/ChessGame').then((m) => ({ default: m.ChessGame })));
const CarromGame = lazy(() => import('../games/carrom/CarromGame').then((m) => ({ default: m.CarromGame })));

// Batch 4 Games: Retro Arcade, Rhythm & Cards
const BeatBreakerGame = lazy(() => import('../games/beat-breaker/BeatBreakerGame').then((m) => ({ default: m.BeatBreakerGame })));
const CosmicBeatsGame = lazy(() => import('../games/cosmic-beats/CosmicBeatsGame').then((m) => ({ default: m.CosmicBeatsGame })));
const BeatDropGame = lazy(() => import('../games/beat-drop/BeatDropGame').then((m) => ({ default: m.BeatDropGame })));
const RhythmTapGame = lazy(() => import('../games/rhythm-tap/RhythmTapGame').then((m) => ({ default: m.RhythmTapGame })));
const SimonBeatsGame = lazy(() => import('../games/simon-beats/SimonBeatsGame').then((m) => ({ default: m.SimonBeatsGame })));
const MemoryFlipGame = lazy(() => import('../games/memory-flip/MemoryFlipGame').then((m) => ({ default: m.MemoryFlipGame })));
const VibeSolitaireGame = lazy(() => import('../games/vibe-solitaire/VibeSolitaireGame').then((m) => ({ default: m.VibeSolitaireGame })));

export const ArcadeGameView: React.FC = () => {
    const { gameId } = useParams<{ gameId: ArcadeGameId }>();
    const navigate = useNavigate();
    const { currentSong } = useAppSelector((state) => state.musicPlayer);

    const [settings, setSettings] = useState<ArcadeSettings>({
        themeMode: 'auto',
        selectedThemeId: 'synthwave-beats',
        sfxEnabled: false,
        sfxVolume: 0.2,
        dialogueEnabled: true,
        dialogueLanguage: 'auto',
    });

    useEffect(() => {
        getArcadeSettings().then(setSettings);
    }, []);

    // Capture round theme on mount or round start
    const initialThemeRef = useRef(
        SongThemeEngine.resolveTheme(currentSong, settings.themeMode, settings.selectedThemeId)
    );

    const songLanguage = (currentSong as any)?.language;

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-start pt-3 sm:pt-4 pb-32 sm:pb-36 px-2 w-full max-w-full overflow-x-hidden">
            <div className="mb-3 sm:mb-4 w-full flex justify-center">
                <NowPlayingMini />
            </div>

            <Suspense
                fallback={
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Loading Arcade Game...</p>
                    </div>
                }
            >
                {/* Retro Arcade Games */}
                {gameId === 'singer-snake' && (
                    <SingerSnake
                        theme={initialThemeRef.current}
                        dialogueEnabled={settings.dialogueEnabled}
                        dialogueLanguage={settings.dialogueLanguage}
                        songLanguage={songLanguage}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'flappy-star' && (
                    <FlappyStar
                        theme={initialThemeRef.current}
                        dialogueEnabled={settings.dialogueEnabled}
                        dialogueLanguage={settings.dialogueLanguage}
                        songLanguage={songLanguage}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'vibe-runner' && (
                    <VibeRunner
                        theme={initialThemeRef.current}
                        dialogueEnabled={settings.dialogueEnabled}
                        dialogueLanguage={settings.dialogueLanguage}
                        songLanguage={songLanguage}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {/* Batch 1: LinkedIn & Daily Mind Puzzles */}
                {gameId === 'vibe-queens' && (
                    <QueensGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'beat-tango' && (
                    <TangoGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'music-pinpoint' && (
                    <PinpointGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'crossclimb' && (
                    <CrossclimbGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'vibe-word' && (
                    <WordleGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {/* Batch 2: Numbers & Logic Masters */}
                {gameId === '2048-beat' && (
                    <Game2048
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'vibe-sudoku' && (
                    <SudokuGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'sound-sweeper' && (
                    <SoundSweeperGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'picross-music' && (
                    <PicrossGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'slide-puzzle' && (
                    <SlidePuzzleGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {/* Batch 3: Classic Board & Tabletop */}
                {gameId === 'ludo-mini' && (
                    <LudoGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'tic-tac-toe' && (
                    <TicTacToeGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'connect-four' && (
                    <ConnectFourGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'vibe-checkers' && (
                    <CheckersGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'vibe-chess' && (
                    <ChessGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'carrom-disc' && (
                    <CarromGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {/* Batch 4: Retro Arcade, Rhythm & Cards */}
                {gameId === 'beat-breaker' && (
                    <BeatBreakerGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'cosmic-beats' && (
                    <CosmicBeatsGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'beat-drop' && (
                    <BeatDropGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'rhythm-tap' && (
                    <RhythmTapGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'simon-beats' && (
                    <SimonBeatsGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'memory-flip' && (
                    <MemoryFlipGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}

                {gameId === 'vibe-solitaire' && (
                    <VibeSolitaireGame
                        theme={initialThemeRef.current}
                        onBack={() => navigate('/arcade')}
                    />
                )}
            </Suspense>
        </div>
    );
};
