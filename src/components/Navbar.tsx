import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSearchedSongs, setSettingsOpen } from '../features/musicplayer/musicPlayerSlice';
import { IoSearchOutline, IoCompassOutline, IoGlobeOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { musicApi } from '../services/musicApi';
import debounce from 'lodash/debounce';

const Navbar: React.FC = ({ focusSearch = false, isVisible: propVisible }: { focusSearch?: boolean; isVisible?: boolean }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const navRef = React.useRef<HTMLElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Dynamic height measurement
    useEffect(() => {
        const updateHeight = () => {
            if (navRef.current) {
                const height = navRef.current.offsetHeight;
                document.documentElement.style.setProperty('--navbar-height', `${height}px`);
            }
        };

        const resizeObserver = new ResizeObserver(updateHeight);
        if (navRef.current) {
            resizeObserver.observe(navRef.current);
        }

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

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
            const results = await musicApi.searchAll(query);
            // Global search returns topQuery, songs, albums, artists, playlists
            dispatch(setSearchedSongs(results));
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
            ref={navRef}
            animate={{ y: finalVisible ? 0 : -200 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 flex flex-col items-center p-2 sm:p-3 md:p-4 bg-white/80 backdrop-blur-lg border-b border-white/20 dark:border-gray-800/20 shadow-lg gap-1.5 md:gap-4 md:flex-row md:justify-between transition-all ${theme.isOled ? 'dark:bg-black/80' : 'dark:bg-gray-900/80'}`}
        >
            <div className="relative flex items-center justify-center md:justify-start w-full md:w-auto order-1 md:order-none">
                <div
                    className="flex flex-col items-center md:items-start cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="text-lg md:text-2xl font-bold text-primary-light dark:text-primary-dark tracking-tight leading-none">
                        Vibe <span className="font-light italic text-primary">On</span>
                    </div>
                    <div className="text-[7px] md:text-[9px] font-medium tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-0.5 uppercase">
                        by <span className="text-red-400/80">WENODH</span>
                    </div>
                </div>
                <div className="absolute right-0 flex items-center gap-2 md:hidden">
                    <button
                        onClick={() => dispatch(setSettingsOpen(true))}
                        aria-label="Settings"
                        className="p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 border-2 border-primary/20 overflow-hidden"
                    >
                        {isAuthenticated && user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <img src="/vibeon-logo.png" alt="Logo" className="w-8 h-8 rounded-full object-cover" />
                        )}
                    </button>
                </div>
            </div>

            <form
                onSubmit={handleSearchSubmit}
                className={`relative items-center w-full md:w-1/3 order-3 md:order-none mt-1 md:mt-0 ${focusSearch ? 'flex' : 'hidden md:flex'}`}
            >
                <div className="relative w-full group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search for songs, albums, artists..."
                        className={`w-full p-2 sm:p-2.5 pl-10 sm:pl-11 rounded-2xl bg-gray-100/50 border-2 border-transparent focus:border-primary/50 focus:bg-white focus:outline-none transition-all shadow-inner text-base ${theme.isOled ? 'dark:bg-black/50 dark:focus:bg-black' : 'dark:bg-gray-800/50 dark:focus:bg-gray-900'}`}
                    />
                    <IoSearchOutline className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-primary' : 'text-gray-500'}`} size={20} />

                    <AnimatePresence>
                        {searchQuery && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    dispatch(setSearchedSongs([]));
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                            >
                                <IoSearchOutline className="rotate-45" size={18} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </form>

            <div className="hidden md:flex items-center gap-4 order-2 md:order-none">
                <button
                    onClick={() => navigate('/explore')}
                    aria-label="Explore"
                    className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-primary/10 overflow-hidden"
                >
                    <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <IoCompassOutline size={18} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-tight">Explore</span>
                </button>
                <button
                    onClick={() => navigate('/globe')}
                    aria-label="Song Globe"
                    className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-primary/10 overflow-hidden"
                >
                    <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <IoGlobeOutline size={18} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-tight">Globe</span>
                </button>
                <button
                    onClick={() => dispatch(setSettingsOpen(true))}
                    aria-label="Settings"
                    className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-primary/10 overflow-hidden"
                >
                    {isAuthenticated && user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                        <img src="/vibeon-logo.png" alt="Logo" className="w-7 h-7 rounded-full object-cover" />
                    )}
                    <span className="text-sm font-bold uppercase tracking-tight">Account</span>
                </button>
            </div>
        </motion.nav>
    );
};

export default Navbar;
