import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setLanguage } from '../features/language/languageSlice';
import { setPreferredQuality, setSettingsOpen } from '../features/musicplayer/musicPlayerSlice';
import { logout as logoutAction } from '../features/auth/authSlice';
import { clearLibrary } from '../features/library/librarySlice';
import ThemeToggle from './ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline, IoLibraryOutline, IoSettingsOutline, IoMusicalNotesOutline, IoGlobeOutline, IoLogOutOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SettingsDrawer: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { language } = useAppSelector((state) => state.language);
    const { preferredQuality, isSettingsOpen } = useAppSelector((state) => state.musicPlayer);
    const { user } = useAppSelector((state) => state.auth);

    const languages = [
        { name: 'Telugu', value: 'telugu' },
        { name: 'Hindi', value: 'hindi' },
        { name: 'English', value: 'english' },
        { name: 'Tamil', value: 'tamil' },
        { name: 'Punjabi', value: 'punjabi' },
    ];

    const qualities = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        dispatch(logoutAction());
        dispatch(clearLibrary());
        dispatch(setSettingsOpen(false));
        navigate('/');
    };

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
                        className="fixed right-0 top-0 bottom-0 w-full xs:w-80 bg-white dark:bg-gray-900 shadow-2xl z-[110] overflow-y-auto"
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

                            {user && (
                                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl flex items-center gap-4">
                                    {user.user_metadata?.avatar_url ? (
                                        <img src={user.user_metadata.avatar_url} alt="" className="w-12 h-12 rounded-full border-2 border-red-500" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white text-xl font-bold">
                                            {user.email?.[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold truncate">{user.user_metadata?.full_name || 'User'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            )}

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
                                                        ? 'bg-red-500 text-white shadow-md'
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
                                                        ? 'bg-red-500 text-white shadow-md'
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
                                                <IoLibraryOutline className="text-red-500" size={20} />
                                                <span className="text-sm font-medium">My Library</span>
                                            </div>
                                            <span className="text-gray-400 text-xs">View all</span>
                                        </button>
                                    </div>
                                </section>

                                {user && (
                                    <section>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all group"
                                        >
                                            <IoLogOutOutline size={20} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-bold">Sign Out</span>
                                        </button>
                                    </section>
                                )}
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
