import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SearchSection: React.FC = () => {
    const { searchedSongs } = useAppSelector((state) => state.musicPlayer);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    if (!searchedSongs || searchedSongs.length === 0) return null;

    return (
        <div className="p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Search Results</h2>
                <button
                    onClick={() => dispatch({ type: 'musicPlayer/setSearchedSongs', payload: [] })}
                    className="text-sm text-red-500 hover:underline"
                >
                    Clear
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchedSongs.map((song: any) => (
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        key={song.id}
                        onClick={() => {
                            if (song.album && song.album.id) {
                                navigate(`/albums/${song.album.id}`);
                            }
                        }}
                        className="cursor-pointer group bg-white/30 dark:bg-gray-800/30 p-2 rounded-xl"
                    >
                        <div className="relative aspect-square mb-2">
                            <img
                                src={song.image?.[2]?.url || song.image}
                                alt={song.name}
                                className="w-full h-full object-cover rounded-lg shadow-md"
                            />
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(playMusic(song));
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                                    ▶
                                </div>
                            </div>
                        </div>
                        <p className="text-sm font-semibold truncate">{song.name}</p>
                        <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default SearchSection;
