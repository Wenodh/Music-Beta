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
        <div className="p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-800/20">
            <div className="flex justify-between items-center mb-4 max-w-7xl mx-auto px-4">
                <h2 className="text-xl font-bold">Search Results</h2>
                <button
                    onClick={() => dispatch({ type: 'musicPlayer/setSearchedSongs', payload: [] })}
                    className="text-sm text-red-500 hover:underline font-medium"
                >
                    Clear Results
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-7xl mx-auto px-4">
                {searchedSongs.map((song: any) => (
                    <motion.div
                        whileHover={{ y: -5 }}
                        key={song.id}
                        onClick={() => {
                            dispatch(playMusic(song));
                        }}
                        className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-red-500/30 transition-all shadow-sm hover:shadow-xl"
                    >
                        <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                            <img
                                src={song.image?.[2]?.url || song.image}
                                alt={song.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <span className="text-xl">▶</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm font-bold truncate group-hover:text-red-500 transition-colors">{song.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-1">{song.primaryArtists}</p>
                        {song.album && typeof song.album === 'object' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/albums/${song.album.id}`);
                                }}
                                className="text-[10px] text-red-400 hover:underline mt-1 truncate block w-full text-left"
                            >
                                Album: {song.album.name}
                            </button>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default SearchSection;
