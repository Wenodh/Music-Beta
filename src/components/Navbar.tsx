import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSearchedSongs, setIsSearching, setSearchError, setSearchQueryState, setSettingsOpen } from '../features/musicplayer/musicPlayerSlice';
import { IoSearchOutline, IoCompassOutline, IoGlobeOutline, IoPeopleOutline, IoGameControllerOutline } from 'react-icons/io5';
import { setIsFriendsModalOpen } from '../features/friends/friendsSlice';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import debounce from 'lodash/debounce';
import { musicApiService } from '../services/musicApiService';

const Navbar: React.FC = ({ focusSearch = false, isVisible: propVisible }: { focusSearch?: boolean; isVisible?: boolean }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const navRef = React.useRef<HTMLElement>(null);
    const { isSearching } = useAppSelector((state) => state.musicPlayer);
    const [searchQuery, setSearchQuery] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

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
    const { unreadNotificationsCount } = useAppSelector((state) => state.social);
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

    const fetchSearchResults = useCallback(async (query: string, signal?: AbortSignal) => {
        if (!query.trim()) {
            dispatch(setSearchedSongs([]));
            dispatch(setIsSearching(false));
            dispatch(setSearchError(null));
            return;
        }
        dispatch(setIsSearching(true));
        dispatch(setSearchError(null));
        try {
            const path = `/api/search?query=${encodeURIComponent(query.trim())}`;
            const res = await musicApiService.fetchWithFallback(path, { signal, timeout: 6000 });
            if (!signal?.aborted) {
                dispatch(setSearchedSongs(res.data?.data || res.data));
                dispatch(setIsSearching(false));
            }
        } catch (error: any) {
            if (error?.name === 'CanceledError' || signal?.aborted) {
                return;
            }
            console.error('Error fetching search results:', error);
            dispatch(setSearchError('Failed to fetch search results.'));
            dispatch(setIsSearching(false));
        }
    }, [dispatch]);

    // Use a ref to always have the latest stable reference to fetchSearchResults
    const fetchSearchResultsRef = useRef(fetchSearchResults);
    useEffect(() => {
        fetchSearchResultsRef.current = fetchSearchResults;
    }, [fetchSearchResults]);

    const debouncedSearch = useMemo(() => {
        return debounce((query: string, signal?: AbortSignal) => {
            fetchSearchResultsRef.current(query, signal);
        }, 300);
    }, []);

    // Clean up debounce and active request on unmount
    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [debouncedSearch]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        dispatch(setSearchQueryState(query));

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (!query.trim()) {
            debouncedSearch.cancel();
            dispatch(setSearchedSongs([]));
            dispatch(setIsSearching(false));
            dispatch(setSearchError(null));
            return;
        }
        dispatch(setIsSearching(true));
        const controller = new AbortController();
        abortControllerRef.current = controller;

        debouncedSearch(query, controller.signal);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Cancel previous request
        debouncedSearch.cancel();
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        fetchSearchResults(searchQuery, controller.signal);
    };

    const finalVisible = propVisible !== undefined ? propVisible : (isVisible || isSearchFocused);

    return (
        <motion.nav
            ref={navRef}
            animate={{ y: finalVisible ? 0 : -200 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 flex flex-col items-center p-2 sm:p-3 md:p-4 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/20 shadow-lg gap-1.5 md:gap-4 md:flex-row md:justify-between transition-all ${theme.isOled ? 'dark:bg-black/80' : 'dark:bg-gray-900/80'}`}
        >
            <div className="relative flex items-center justify-center md:justify-start w-full md:w-auto order-1 md:order-none">
                <div
                    className="flex flex-col items-center md:items-start cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="text-lg md:text-2xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Vibe <span className="font-light italic text-primary">On</span></span>
                    </div>
                    <div className="text-[7px] md:text-[9px] font-medium tracking-[0.2em] text-gray-500 dark:text-gray-400 mt-0.5 uppercase">
                        by <span className="text-primary font-bold">WENODH</span>
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
                        className={`w-full p-2 sm:p-2.5 pl-10 sm:pl-11 rounded-2xl bg-gray-100 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/50 focus:bg-white dark:focus:bg-gray-900 text-slate-900 dark:text-slate-100 focus:outline-none transition-all shadow-inner text-base`}
                    />
                    <IoSearchOutline className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-primary' : 'text-gray-500'}`} size={20} />

                    <AnimatePresence>
                        {isSearching ? (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : searchQuery ? (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    dispatch(setSearchQueryState(''));
                                    debouncedSearch.cancel();
                                    if (abortControllerRef.current) {
                                        abortControllerRef.current.abort();
                                    }
                                    dispatch(setSearchedSongs([]));
                                    dispatch(setIsSearching(false));
                                    dispatch(setSearchError(null));
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                            >
                                <IoSearchOutline className="rotate-45" size={18} />
                            </motion.button>
                        ) : null}
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
                    onClick={() => navigate('/arcade')}
                    aria-label="Arcade"
                    className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-primary/10 overflow-hidden"
                >
                    <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <IoGameControllerOutline size={18} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-tight">Arcade</span>
                </button>
                <button
                    onClick={() => dispatch(setIsFriendsModalOpen(true))}
                    aria-label="Friends"
                    className="relative p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-primary/10 overflow-hidden"
                >
                    <div className="relative w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <IoPeopleOutline size={18} />
                        {unreadNotificationsCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                        )}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-tight">Friends</span>
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
