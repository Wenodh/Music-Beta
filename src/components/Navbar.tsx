import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setLanguage } from '../features/language/languageSlice';
import { setSearchedSongs } from '../features/musicplayer/musicPlayerSlice';
import { IoSearchOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { motion } from 'framer-motion';
import axios from 'axios';
import { search as searchUrl } from '../constants';
import _ from 'lodash';

const Navbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { language } = useAppSelector((state) => state.language);

    const languages = [
        { name: 'Telugu', value: 'telugu' },
        { name: 'Hindi', value: 'hindi' },
        { name: 'English', value: 'english' },
        { name: 'Tamil', value: 'tamil' },
        { name: 'Punjabi', value: 'punjabi' },
    ];

    const fetchSearchts = async (query: string) => {
        if (!query.trim()) {
            dispatch(setSearchedSongs([]));
            return;
        }
        try {
            const res = await axios.get(`${searchUrl}${query}`);
            const songs = res.data.data.songs.results;
            dispatch(setSearchedSongs(songs));
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    const debouncedSearch = _.debounce((query: string) => {
        fetchSearchts(query);
    }, 500);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSearchts(searchQuery);
    };

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 flex flex-col md:flex-row items-center justify-between p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-white/20 dark:border-gray-800/20 shadow-sm gap-4"
        >
            <div
                className="text-2xl font-bold cursor-pointer text-primary-light dark:text-primary-dark tracking-tight"
                onClick={() => navigate('/')}
            >
                Music<span className="font-light italic">Beta</span>
            </div>

            <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full md:w-1/3"
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

            <div className="flex items-center gap-4">
                <select
                    value={language}
                    onChange={(e) => dispatch(setLanguage(e.target.value))}
                    className="p-2 rounded-lg bg-gray-100/50 dark:bg-gray-800/50 border border-transparent focus:outline-none cursor-pointer text-sm font-medium transition-all"
                >
                    {languages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                            {lang.name}
                        </option>
                    ))}
                </select>
                <ThemeToggle />
            </div>
        </motion.nav>
    );
};

export default Navbar;
