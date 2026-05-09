import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSearchedSongs } from '../features/musicplayer/musicPlayerSlice';
import { IoSearchOutline, IoPersonCircleOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { search as searchUrl } from '../constants';
import _ from 'lodash';

import { setSettingsOpen } from '../features/musicplayer/musicPlayerSlice';

const Navbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { isSettingsOpen } = useAppSelector((state) => state.musicPlayer);
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
            // Global search returns topQuery, songs, albums, artists, playlists
            dispatch(setSearchedSongs(res.data.data));
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    const debouncedSearch = _.debounce((query: string) => {
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

    return (
        <motion.nav
            animate={{ y: isVisible || isSearchFocused ? 0 : -200 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center p-3 md:p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-white/20 dark:border-gray-800/20 shadow-lg gap-2 md:gap-4 md:flex-row md:justify-between transition-all"
        >
            <div className="relative flex items-center justify-center md:justify-start w-full md:w-auto order-1 md:order-none">
                <div
                    className="flex flex-col items-center md:items-start cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="text-lg md:text-2xl font-bold text-primary-light dark:text-primary-dark tracking-tight leading-none">
                        Vibe<span className="font-light italic text-primary">On</span>
                    </div>
                    <div className="text-[7px] md:text-[9px] font-medium tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-0.5 uppercase">
                        by <span className="text-red-400/80">WENODH</span>
                    </div>
                </div>
                <div className="absolute right-0 md:hidden">
                    <button
                        onClick={() => dispatch(setSettingsOpen(true))}
                        aria-label="Settings"
                        className="p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 border-2 border-primary/20"
                    >
                        <img src="/android/android-launchericon-192-192.png" alt="Logo" className="w-8 h-8 rounded-full object-cover" />
                    </button>
                </div>
            </div>

            <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full md:w-1/3 order-3 md:order-none mt-1 md:mt-0"
            >
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search for songs..."
                    className="w-full p-2 pl-10 rounded-full bg-gray-100/50 dark:bg-gray-800/50 border border-transparent focus:border-red-400/50 focus:ring-2 focus:ring-red-400/20 focus:outline-none transition-all"
                />
                <IoSearchOutline className="absolute left-3 text-gray-500" />
            </form>

            <div className="hidden md:flex items-center gap-4 order-2 md:order-none">
                <button
                    onClick={() => dispatch(setSettingsOpen(true))}
                    aria-label="Settings"
                    className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-primary/10"
                >
                    <img src="/android/android-launchericon-192-192.png" alt="Logo" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-sm font-bold uppercase tracking-tight">Account</span>
                </button>
            </div>
        </motion.nav>
    );
};

export default Navbar;
