import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../hooks/redux';
import { SongThemeEngine } from '../engine/songThemeEngine';
import { ArcadeGameId, ArcadeSettings, ArcadeCategory, ArcadeGameMetadata } from '../types';
import { getAllScores, getArcadeSettings, saveArcadeSettings } from '../services/arcadeStorage';
import { ArcadeLeaderboardService } from '../services/arcadeLeaderboardService';
import { NowPlayingMini } from '../components/NowPlayingMini';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { LeaderboardModal } from '../components/LeaderboardModal';
import {
    IoGameControllerOutline,
    IoColorPaletteOutline,
    IoTrophyOutline,
    IoPlay,
    IoSearchOutline,
    IoSparkles,
} from 'react-icons/io5';

export const ARCADE_GAMES_CATALOG: ArcadeGameMetadata[] = [
    // Category 1: LinkedIn & Daily Mind Puzzles (Batch 1)
    {
        id: 'vibe-queens',
        title: 'Queens',
        desc: 'Place 1 Queen per row, column, and colored region without any two touching.',
        icon: '👑',
        tag: 'Territory Logic',
        category: 'mind',
        metricType: 'time_ms',
        metricUnit: 's',
        lowerIsBetter: true,
        supportsDaily: true,
        batch: 1,
    },
    {
        id: 'beat-tango',
        title: 'Beat Tango',
        desc: 'Binary grid puzzle balancing suns and moons with equal rows and constraint rules.',
        icon: '☀️',
        tag: 'Binary Balance',
        category: 'mind',
        metricType: 'time_ms',
        metricUnit: 's',
        lowerIsBetter: true,
        supportsDaily: true,
        batch: 1,
    },
    {
        id: 'music-pinpoint',
        title: 'Music Pinpoint',
        desc: 'Deduce the overarching music category in as few progressive clues as possible.',
        icon: '🎯',
        tag: 'Word Deduction',
        category: 'mind',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: true,
        batch: 1,
    },
    {
        id: 'crossclimb',
        title: 'Crossclimb',
        desc: 'Solve trivia word clues and reorder ladder rungs so each differs by one letter.',
        icon: '🪜',
        tag: 'Word Ladder',
        category: 'mind',
        metricType: 'time_ms',
        metricUnit: 's',
        lowerIsBetter: true,
        supportsDaily: true,
        batch: 1,
    },
    {
        id: 'vibe-word',
        title: 'Vibe Wordle',
        desc: 'Guess the hidden 5-letter musical term or song title in 6 tries or fewer.',
        icon: '🟩',
        tag: 'Word Guess',
        category: 'mind',
        metricType: 'moves',
        metricUnit: 'guesses',
        lowerIsBetter: true,
        supportsDaily: true,
        batch: 1,
    },
    // Category 2: Numbers & Logic Masters (Batch 2)
    {
        id: '2048-beat',
        title: '2048 Beat',
        desc: 'Swipe and merge matching vinyl tracks from 2 up to the Platinum 2048 Disc.',
        icon: '💽',
        tag: 'Sliding Vinyls',
        category: 'logic',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 2,
    },
    {
        id: 'vibe-sudoku',
        title: 'Vibe Sudoku',
        desc: 'Classic 9x9 harmonic logic puzzle with Easy, Medium, and Hard challenges.',
        icon: '🔢',
        tag: 'Harmonic Grid',
        category: 'logic',
        metricType: 'time_ms',
        metricUnit: 's',
        lowerIsBetter: true,
        supportsDaily: true,
        batch: 2,
    },
    {
        id: 'sound-sweeper',
        title: 'Sound Sweeper',
        desc: 'Clear stage equipment grid without triggering screeching feedback traps.',
        icon: '💣',
        tag: 'Audio Sweeper',
        category: 'logic',
        metricType: 'time_ms',
        metricUnit: 's',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 2,
    },
    {
        id: 'picross-music',
        title: 'Music Picross',
        desc: 'Paint pixel-art musical instruments using row and column number clues.',
        icon: '🎨',
        tag: 'Pixel Art Logic',
        category: 'logic',
        metricType: 'time_ms',
        metricUnit: 's',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 2,
    },
    {
        id: 'slide-puzzle',
        title: '15-Slide Puzzle',
        desc: 'Slide numbered stage tiles to restore harmony in the fewest moves possible.',
        icon: '🧩',
        tag: 'Classic Slider',
        category: 'logic',
        metricType: 'moves',
        metricUnit: 'moves',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 2,
    },
    // Category 3: Classic Board & Tabletop (Batch 3)
    {
        id: 'ludo-mini',
        title: 'Ludo Mini',
        desc: 'Fast-paced 2 or 4-player Ludo against smart AI bots with safe zones & knockouts.',
        icon: '🎲',
        tag: 'Fast-Track Ludo',
        category: 'board',
        metricType: 'moves',
        metricUnit: 'turns',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 3,
    },
    {
        id: 'tic-tac-toe',
        title: 'Tic-Tac-Toe Pro',
        desc: 'Classic 3x3 tactical showdown against an unbeatable Minimax bot or local 2P.',
        icon: '❌',
        tag: 'Tactical Grid',
        category: 'board',
        metricType: 'streak',
        metricUnit: 'streak',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 3,
    },
    {
        id: 'connect-four',
        title: 'Connect Four',
        desc: 'Drop colorful discs vertically to connect four in a row against an intelligent CPU.',
        icon: '🔴',
        tag: 'Gravity Drop',
        category: 'board',
        metricType: 'moves',
        metricUnit: 'turns',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 3,
    },
    {
        id: 'vibe-checkers',
        title: 'Vibe Checkers',
        desc: 'Standard 8x8 draughts with mandatory captures, king promotions, and minimax AI.',
        icon: '⚪',
        tag: 'English Draughts',
        category: 'board',
        metricType: 'moves',
        metricUnit: 'moves',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 3,
    },
    {
        id: 'vibe-chess',
        title: 'Vibe Chess',
        desc: 'Grandmaster strategy powered by chess.js with checkmate detection and minimax bot.',
        icon: '♟️',
        tag: 'Grandmaster Chess',
        category: 'board',
        metricType: 'moves',
        metricUnit: 'moves',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 3,
    },
    {
        id: 'carrom-disc',
        title: 'Carrom Disc',
        desc: 'Top-down realistic physics board flicking striker, white/black coins, and red queen.',
        icon: '🎯',
        tag: 'Tabletop Physics',
        category: 'board',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 3,
    },
    // Category 4: Retro Classics
    {
        id: 'singer-snake',
        title: 'Singer Snake',
        desc: 'Guide the beat snake to collect music notes and special vinyl loops.',
        icon: '🐍',
        tag: 'Classic Rhythm Snake',
        category: 'retro',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 1,
    },
    {
        id: 'flappy-star',
        title: 'Flappy Star',
        desc: 'Tap to flap through towering speakers and equalizer stage obstacles.',
        icon: '⭐',
        tag: 'Stage Jumper',
        category: 'retro',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 1,
    },
    {
        id: 'vibe-runner',
        title: 'Vibe Runner',
        desc: 'Endless retro runner leaping over stage amps and tangled mic cables.',
        icon: '🏃',
        tag: 'Endless Beat Rush',
        category: 'retro',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 1,
    },
    {
        id: 'beat-breaker',
        title: 'Beat Breaker',
        desc: 'Bounce the guitar pick paddle to smash colorful soundwave bricks and clear stages.',
        icon: '🧱',
        tag: 'Breakout Synth',
        category: 'retro',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 4,
    },
    {
        id: 'cosmic-beats',
        title: 'Cosmic Beats',
        desc: 'Retro spaceship defender destroying descending alien waves synced to beat pulses.',
        icon: '👾',
        tag: 'Space Invaders',
        category: 'retro',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 4,
    },
    // Category 5: Casual, Rhythm & Cards (Batch 4)
    {
        id: 'beat-drop',
        title: 'Beat Drop',
        desc: 'Falling tetromino puzzle with classic block clears, wall kicks, and drop FX.',
        icon: '🕹️',
        tag: 'Tetris Rhythm',
        category: 'rhythm',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 4,
    },
    {
        id: 'rhythm-tap',
        title: 'Rhythm Tap',
        desc: '4-lane vertical scrolling piano tiles tapping beats as they cross the hit line.',
        icon: '🎹',
        tag: 'Piano Tiles',
        category: 'rhythm',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 4,
    },
    {
        id: 'simon-beats',
        title: 'Simon Beats',
        desc: '4 glowing melodic drum pads. Listen closely and repeat the expanding sequence.',
        icon: '🥁',
        tag: 'Memory Melody',
        category: 'rhythm',
        metricType: 'points',
        metricUnit: 'beats',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 4,
    },
    {
        id: 'memory-flip',
        title: 'Memory Flip',
        desc: 'Card-matching grid pairing musical instruments, studio gear, and vinyls.',
        icon: '🎴',
        tag: 'Card Pairs',
        category: 'rhythm',
        metricType: 'moves',
        metricUnit: 'moves',
        lowerIsBetter: true,
        supportsDaily: false,
        batch: 4,
    },
    {
        id: 'vibe-solitaire',
        title: 'Klondike Solitaire',
        desc: 'Classic 7-column card solitaire with tableau stacking and foundation building.',
        icon: '🃏',
        tag: 'Classic Cards',
        category: 'rhythm',
        metricType: 'points',
        metricUnit: 'pts',
        lowerIsBetter: false,
        supportsDaily: false,
        batch: 4,
    },
];

export const ArcadeHome: React.FC = () => {
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

    const [scores, setScores] = useState<Record<string, number>>({});
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'popular' | 'high-score'>('popular');

    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const [leaderboardModalGame, setLeaderboardModalGame] = useState<{ id: ArcadeGameId; title: string } | null>(null);

    useEffect(() => {
        getArcadeSettings().then(setSettings);
        getAllScores().then(setScores);
        ArcadeLeaderboardService.reconcileGuestScores();
    }, []);

    const activeTheme = SongThemeEngine.resolveTheme(
        currentSong,
        settings.themeMode,
        settings.selectedThemeId
    );

    const updateSettings = async (newSettings: ArcadeSettings) => {
        setSettings(newSettings);
        await saveArcadeSettings(newSettings);
    };

    const categories: { id: string; label: string }[] = [
        { id: 'all', label: 'All Games' },
        { id: 'mind', label: 'Mind Puzzles' },
        { id: 'logic', label: 'Logic & Numbers' },
        { id: 'board', label: 'Board Games' },
        { id: 'retro', label: 'Retro Classics' },
        { id: 'rhythm', label: 'Rhythm & Cards' },
    ];

    const filteredGames = useMemo(() => {
        return ARCADE_GAMES_CATALOG.filter((game) => {
            const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
            const matchesSearch =
                game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                game.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                game.tag.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        }).sort((a, b) => {
            if (sortBy === 'high-score') {
                const scoreA = scores[a.id] || 0;
                const scoreB = scores[b.id] || 0;
                return scoreB - scoreA;
            }
            return 0;
        });
    }, [selectedCategory, searchQuery, sortBy, scores]);

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-32 sm:pb-36 space-y-6 sm:space-y-8 overflow-hidden">
            {/* Hero Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 sm:p-8 bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-black/60 border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="space-y-2 z-10 text-center md:text-left w-full md:w-auto">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-primary/20 border border-primary/30 rounded-full text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest">
                        <IoGameControllerOutline size={15} /> 26-Game Suite & Daily Challenges
                    </div>
                    <h1 className="text-2xl sm:text-5xl font-black text-white tracking-tight">
                        Vibe <span className="text-primary italic">Arcade</span>
                    </h1>
                    <p className="text-xs sm:text-base text-gray-300 font-medium">
                        "Play your music. Challenge your mind. Live the moment."
                    </p>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2.5 z-10 w-full sm:w-auto">
                    <NowPlayingMini />
                    <button
                        onClick={() => setIsThemeModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all text-white shadow-sm w-full sm:w-auto cursor-pointer"
                    >
                        <IoColorPaletteOutline size={15} className="text-primary" />
                        <span className="truncate">Theme: {activeTheme.name}</span>
                    </button>
                </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search games..."
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Game Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredGames.map((game) => {
                    return (
                        <motion.div
                            key={game.id}
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-gray-900/80 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl p-2.5 bg-white/5 rounded-2xl">{game.icon}</span>
                                    {game.supportsDaily && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
                                            <IoSparkles size={11} /> Daily
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                                        {game.tag}
                                    </p>
                                    <h3 className="text-lg font-black text-white">{game.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{game.desc}</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/arcade/${game.id}`)}
                                        className="flex-1 min-h-[42px] flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-md shadow-primary/20 text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        <IoPlay size={14} /> Play
                                    </button>
                                    <button
                                        onClick={() => setLeaderboardModalGame({ id: game.id, title: game.title })}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-amber-400 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                                        aria-label="View Leaderboard"
                                    >
                                        <IoTrophyOutline size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <ThemeSelectorModal
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                settings={settings}
                onUpdateSettings={updateSettings}
            />

            {leaderboardModalGame && (
                <LeaderboardModal
                    isOpen={Boolean(leaderboardModalGame)}
                    onClose={() => setLeaderboardModalGame(null)}
                    gameId={leaderboardModalGame.id}
                    gameTitle={leaderboardModalGame.title}
                />
            )}
        </div>
    );
};
