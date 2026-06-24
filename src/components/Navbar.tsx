import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSearchedSongs, setSettingsOpen } from '../features/musicplayer/musicPlayerSlice';
import { IoSearchOutline, IoCompassOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { search as searchUrl } from '../constants';
import debounce from 'lodash/debounce';

const Navbar: React.FC = ({ focusSearch = false, isVisible: propVisible }: { focusSearch?: boolean; isVisible?: boolean }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (focusSearch && inputRef.current) {
            inputRef.current.focus();
        }
    }, [focusSearch]);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { theme } = useAppSelector((state) => state.ui);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (isSearchFocused) return;
            const currentScrollY = window.scrollY;
            if (currentScrollY > 10) {
                if (currentScrollY > lastScrollY) {
                    setIsVisible(false);
                } else {
                    setIsVisible(true);
                }
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY, isSearchFocused]);

    const fetchSearchResults = async (query: string) => {
        if (!query.trim()) {
            dispatch(setSearchedSongs([]));
            return;
        }
        try {
            const res = await axios.get(`${searchUrl}${query}`);
            dispatch(setSearchedSongs(res.data.data));
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    const debouncedSearch = debounce((query: string) => {
        fetchSearchResults(query);
    }, 500);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSearchResults(searchQuery);
    };

    const finalVisible = propVisible !== undefined ? propVisible : (isVisible || isSearchFocused);

    return (
        <motion.nav
            animate={{ y: finalVisible ? 0 : -200 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center p-2 sm:p-3 md:p-4 glass-effect border-b shadow-lg gap-1.5 md:gap-4 md:flex-row md:justify-between transition-all"
        >
            <div className="relative flex items-center justify-center md:justify-start w-full md:w-auto order-1 md:order-none">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center md:items-start cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    <div className="text-xl md:text-3xl font-black text-primary tracking-tighter leading-none font-display">
                        Vibe <span className="text-black dark:text-white opacity-90">On</span>
                    </div>
                    <div className="text-[7px] md:text-[9px] font-bold tracking-[0.3em] text-gray-500 mt-0.5 uppercase opacity-60">
                        Premium Audio
                    </div>
                </motion.div>
                <div className="absolute right-0 flex items-center gap-2 md:hidden">
                    <button
                        onClick={() => dispatch(setSettingsOpen(true))}
                        className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden shadow-lg active:scale-90 transition-transform"
                    >
                        {isAuthenticated && user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <img src="/vibeon-logo.png" alt="" className="w-full h-full object-cover" />
                        )}
                    </button>
                </div>
            </div>

            <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full md:w-[40%] order-3 md:order-none mt-1 md:mt-0"
            >
                <div className="relative w-full group perspective-1000">
                    <motion.div
                        animate={isSearchFocused ? { rotateX: 5 } : { rotateX: 0 }}
                        className="relative"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            placeholder="Search songs, artists, or moods..."
                            className={`w-full p-2.5 sm:p-3 pl-11 rounded-2xl bg-gray-100/50 dark:bg-white/5 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-black focus:outline-none transition-all shadow-xl text-base font-medium`}
                        />
                        <IoSearchOutline className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-primary' : 'text-gray-500'}`} size={20} />
                    </motion.div>
                </div>
            </form>

            <div className="hidden md:flex items-center gap-3 order-2 md:order-none">
                <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/explore')}
                    className="h-11 px-5 rounded-xl border border-primary/10 flex items-center gap-3 transition-colors bg-white/5"
                >
                    <IoCompassOutline size={20} className="text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wide">Explore</span>
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Settings"
                    onClick={() => dispatch(setSettingsOpen(true))}
                    className="w-11 h-11 rounded-full border-2 border-primary/20 overflow-hidden shadow-lg"
                >
                    {isAuthenticated && user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <img src="/vibeon-logo.png" alt="" className="w-full h-full object-cover" />
                    )}
                </motion.button>
            </div>
        </motion.nav>
    );
};

export default Navbar;
