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

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 100) {
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
    }, [lastScrollY]);

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
            initial={{ y: 0 }}
            animate={{ y: isVisible ? 0 : -150 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="sticky top-0 z-50 flex flex-col items-center p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-white/20 dark:border-gray-800/20 shadow-sm gap-4 md:flex-row md:justify-between transition-colors"
        >
            <div className="relative flex items-center justify-center md:justify-start w-full md:w-auto order-1 md:order-none">
                <div
                    className="flex flex-col items-center md:items-start cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="text-2xl font-bold text-primary-light dark:text-primary-dark tracking-tight leading-none">
                        Vibe<span className="font-light italic text-red-500">On</span>
                    </div>
                    <div className="text-[9px] font-medium tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-0.5 uppercase">
                        by <span className="text-red-400/80">WENODH</span>
                    </div>
                </div>
                <div className="absolute right-0 md:hidden">
                    <button
                        onClick={() => dispatch(setSettingsOpen(true))}
                        className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95"
                    >
                        <IoPersonCircleOutline size={30} />
                    </button>
                </div>
            </div>

            <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full md:w-1/3 order-3 md:order-none mt-4 md:mt-0"
            >
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search for songs..."
                    className="w-full p-2 pl-10 rounded-full bg-gray-100/50 dark:bg-gray-800/50 border border-transparent focus:border-red-400/50 focus:outline-none transition-all"
                />
                <IoSearchOutline className="absolute left-3 text-gray-500" />
            </form>

            <div className="hidden md:flex items-center gap-4 order-2 md:order-none">
                <button
                    onClick={() => dispatch(setSettingsOpen(true))}
                    className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-95 flex items-center gap-2"
                >
                    <IoPersonCircleOutline size={28} />
                    <span className="text-sm font-semibold">Account</span>
                </button>
            </div>
        </motion.nav>
    );
};

export default Navbar;
