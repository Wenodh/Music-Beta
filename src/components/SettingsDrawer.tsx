import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setLanguage } from '../features/language/languageSlice';
import { setPreferredQuality, setSettingsOpen, setGaplessEnabled, setCrossfadeDuration, resetPlayerData } from '../features/musicplayer/musicPlayerSlice';
import { setEqualizerOpen, setAccentColor, setOledMode, showToast } from '../features/ui/uiSlice';
import { clearLibrary } from '../features/library/librarySlice';
import ThemeToggle from './ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline, IoLibraryOutline, IoSettingsOutline, IoMusicalNotesOutline, IoGlobeOutline, IoOptionsOutline, IoTrashOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const SettingsDrawer: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { language } = useAppSelector((state) => state.language);
    const { theme } = useAppSelector((state) => state.ui);
    const { preferredQuality, isSettingsOpen, equalizerSettings, isGaplessEnabled, crossfadeDuration } = useAppSelector((state) => state.musicPlayer);

    const accentColors = [
        { name: 'Red', value: '#ef4444' },
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Purple', value: '#a855f7' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Orange', value: '#f97316' },
    ];

    const languages = [
        { name: 'Telugu', value: 'telugu' },
        { name: 'Hindi', value: 'hindi' },
        { name: 'English', value: 'english' },
        { name: 'Tamil', value: 'tamil' },
        { name: 'Punjabi', value: 'punjabi' },
    ];

    const qualities = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(setSettingsOpen(false))}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed right-0 top-0 bottom-0 w-full xs:w-80 shadow-2xl z-[110] overflow-y-auto ${theme.isOled ? 'bg-white dark:!bg-black' : 'bg-white dark:bg-gray-900'}`}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <IoSettingsOutline /> Settings
                                </h2>
                                <button onClick={() => dispatch(setSettingsOpen(false))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                    <IoCloseOutline size={28} />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <section>
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                        <IoGlobeOutline /> Language
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.value}
                                                onClick={() => dispatch(setLanguage(lang.value))}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    language === lang.value
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                        <IoMusicalNotesOutline /> Audio Quality
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {qualities.map((q) => (
                                            <button
                                                key={q}
                                                onClick={() => dispatch(setPreferredQuality(q as any))}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                                                    preferredQuality === q
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4">Personalization</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                            <span className="text-sm font-medium">Dark Mode</span>
                                            <ThemeToggle />
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigate('/library');
                                                dispatch(setSettingsOpen(false));
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <IoLibraryOutline className="text-primary" size={20} />
                                                <span className="text-sm font-medium">My Library</span>
                                            </div>
                                            <span className="text-gray-400 text-xs">View all</span>
                                        </button>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                            <div>
                                                <p className="text-sm font-medium">OLED Mode</p>
                                                <p className="text-[10px] text-gray-500">Pure black background</p>
                                            </div>
                                            <button
                                                onClick={() => dispatch(setOledMode(!theme.isOled))}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${theme.isOled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: theme.isOled ? 20 : 2 }}
                                                    className="w-4 h-4 bg-white rounded-full absolute top-0.5"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4">Accent Color</h3>
                                    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                        {accentColors.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => dispatch(setAccentColor(color.value))}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                    theme.accentColor === color.value
                                                        ? 'border-white scale-110 shadow-lg'
                                                        : 'border-transparent hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4">Playback Settings</h3>
                                    <div className="space-y-3">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Gapless (Crossfade)</p>
                                                    <p className="text-[10px] text-gray-500">Smooth transitions between songs</p>
                                                </div>
                                                <button
                                                    onClick={() => dispatch(setGaplessEnabled(!isGaplessEnabled))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${isGaplessEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                >
                                                    <motion.div
                                                        animate={{ x: isGaplessEnabled ? 20 : 2 }}
                                                        className="w-4 h-4 bg-white rounded-full absolute top-0.5"
                                                    />
                                                </button>
                                            </div>

                                            {isGaplessEnabled && (
                                                <div className="pt-2">
                                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                        <span>Crossfade Duration</span>
                                                        <span>{crossfadeDuration}s</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="12"
                                                        value={crossfadeDuration}
                                                        onChange={(e) => dispatch(setCrossfadeDuration(parseInt(e.target.value)))}
                                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                dispatch(setEqualizerOpen(true));
                                                dispatch(setSettingsOpen(false));
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <IoOptionsOutline className="text-primary" size={20} />
                                                <div>
                                                    <p className="text-sm font-medium text-left">Equalizer</p>
                                                    <p className="text-[10px] text-gray-500 text-left">
                                                        {equalizerSettings.enabled ? equalizerSettings.preset : 'Disabled'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-gray-400 text-xs">Configure</span>
                                        </button>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                        <IoTrashOutline /> Danger Zone
                                    </h3>
                                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl">
                                        <p className="text-[10px] text-red-600 dark:text-red-400 mb-3 font-medium">
                                            This will permanently clear your favorites, playlists, and recently played history.
                                        </p>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to reset all app data? This cannot be undone.')) {
                                                    dispatch(clearLibrary());
                                                    dispatch(resetPlayerData());
                                                    dispatch(showToast({ message: 'All app data has been reset', type: 'info' }));
                                                    dispatch(setSettingsOpen(false));
                                                }
                                            }}
                                            className="w-full py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <IoTrashOutline size={16} /> Reset All Data
                                        </button>
                                    </div>
                                </section>
                            </div>

                            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                                <p className="text-xs text-gray-400">VibeOn Version 1.2.0</p>
                                <p className="text-[10px] text-gray-500 mt-1">Made with ❤️ by WENODH</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SettingsDrawer;
