import React from 'react';
import { useAppSelector } from '../hooks/redux';
import { IoSearchOutline } from 'react-icons/io5';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

const SearchPage: React.FC = () => {
    const { theme } = useAppSelector((state) => state.ui);
    const { searchedSongs } = useAppSelector((state) => state.musicPlayer);

    const hasResults = searchedSongs && (Array.isArray(searchedSongs) ? searchedSongs.length > 0 : Object.keys(searchedSongs).length > 0);

    return (
        <>
            <Navbar focusSearch={true} />
            <div className={`flex flex-col items-center justify-center min-h-[60vh] px-4 text-center ${hasResults ? 'hidden' : ''}`}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${theme.isOled ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-800'} text-gray-400`}
                >
                    <IoSearchOutline size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Search Vibe On</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Use the search bar at the top to find your favorite songs, albums, and artists.
                </p>
            </div>
        </>
    );
};

export default SearchPage;
