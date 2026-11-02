import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../hooks/redux';
import { SongThemeEngine } from '../engine/songThemeEngine';
import { ArcadeGameId, ArcadeSettings } from '../types';
import { getAllScores, getArcadeSettings, saveArcadeSettings } from '../services/arcadeStorage';
import { NowPlayingMini } from '../components/NowPlayingMini';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';
import { IoGameControllerOutline, IoColorPaletteOutline, IoTrophyOutline, IoSettingsOutline, IoPlay } from 'react-icons/io5';

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

    const [scores, setScores] = useState<Record<ArcadeGameId, number>>({
        'singer-snake': 0,
        'flappy-star': 0,
        'vibe-runner': 0,
    });

    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    useEffect(() => {
        getArcadeSettings().then(setSettings);
        getAllScores().then(setScores);
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

    const games: { id: ArcadeGameId; title: string; desc: string; icon: string; tag: string }[] = [
        {
            id: 'singer-snake',
            title: 'Singer Snake',
            desc: 'Guide the beat snake to collect music notes and special vinyl loops.',
            icon: '🐍',
            tag: 'Classic Rhythm Snake',
        },
        {
            id: 'flappy-star',
            title: 'Flappy Star',
            desc: 'Tap to flap through towering speakers and equalizer stage obstacles.',
            icon: '⭐',
            tag: 'Stage Jumper',
        },
        {
            id: 'vibe-runner',
            title: 'Vibe Runner',
            desc: 'Endless retro runner leaping over stage amps and tangled mic cables.',
            icon: '🏃',
            tag: 'Endless Beat Rush',
        },
    ];

    return (
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-32 sm:pb-36 space-y-6 sm:space-y-8 overflow-hidden">
            {/* Hero Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 sm:p-8 bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-black/60 border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="space-y-2 z-10 text-center md:text-left w-full md:w-auto">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-primary/20 border border-primary/30 rounded-full text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest">
                        <IoGameControllerOutline size={15} /> Retro Music Arcade
                    </div>
                    <h1 className="text-2xl sm:text-5xl font-black text-white tracking-tight">
                        Vibe <span className="text-primary italic">Arcade</span>
                    </h1>
                    <p className="text-xs sm:text-base text-gray-300 font-medium">
                        "Play your music. Live the moment."
                    </p>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2.5 z-10 w-full sm:w-auto">
                    <NowPlayingMini />
                    <button
                        onClick={() => setIsThemeModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all text-white shadow-sm w-full sm:w-auto"
                    >
                        <IoColorPaletteOutline size={15} className="text-primary" />
                        <span className="truncate">Theme: {activeTheme.name}</span>
                    </button>
                </div>
            </div>

            {/* Game Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {games.map((game) => {
                    const highScore = scores[game.id] || 0;
                    return (
                        <motion.div
                            key={game.id}
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-gray-900/80 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden group"
                        >
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl sm:text-4xl p-2.5 sm:p-3 bg-white/5 rounded-2xl">{game.icon}</span>
                                    <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                                        <IoTrophyOutline size={13} /> {highScore} pts
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                                        {game.tag}
                                    </p>
                                    <h3 className="text-lg sm:text-xl font-black text-white">{game.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{game.desc}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/arcade/${game.id}`)}
                                className="mt-5 sm:mt-6 w-full min-h-[44px] flex items-center justify-center gap-2 py-3 bg-primary hover:bg-red-600 text-white font-bold rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-primary/20 text-xs sm:text-sm uppercase tracking-wider"
                            >
                                <IoPlay size={16} /> Play Now
                            </button>
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
        </div>
    );
};
