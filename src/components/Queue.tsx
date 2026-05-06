import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { reorderQueue, removeFromQueue, playMusic } from '../features/musicplayer/musicPlayerSlice';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { IoClose, IoReorderThreeOutline } from 'react-icons/io5';

interface QueueProps {
    isOpen: boolean;
    onClose: () => void;
}

const Queue: React.FC<QueueProps> = ({ isOpen, onClose }) => {
    const { songs, currentSong, recommendations } = useAppSelector((state) => state.musicPlayer);
    const dispatch = useAppDispatch();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-0 bottom-0 w-full md:w-80 bg-white dark:bg-gray-900 shadow-2xl z-[60] border-l border-gray-200 dark:border-gray-800 flex flex-col"
                >
                    <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-xl font-bold">Queue</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <IoClose size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <Reorder.Group axis="y" values={songs} onReorder={(newSongs) => dispatch(reorderQueue(newSongs))}>
                            {songs.map((song) => (
                                <Reorder.Item
                                    key={song.id}
                                    value={song}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer group mb-1 ${
                                        currentSong?.id === song.id ? 'bg-red-50 dark:bg-red-900/10 text-red-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                    onClick={() => dispatch(playMusic(song))}
                                >
                                    <IoReorderThreeOutline className="text-gray-400 shrink-0" />
                                    <img
                                        src={Array.isArray(song.image) ? song.image[0]?.url : song.image}
                                        alt=""
                                        className="w-10 h-10 rounded object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{song.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{song.primaryArtists}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch(removeFromQueue(song.id));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                                    >
                                        <IoClose size={16} />
                                    </button>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {recommendations.length > 0 && (
                            <div className="mt-6 mb-4 px-2">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-2 uppercase tracking-wider">
                                    Suggested Songs
                                </h3>
                                {recommendations.map((song) => (
                                    <div
                                        key={song.id}
                                        className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 mb-1 group"
                                        onClick={() => dispatch(playMusic(song))}
                                    >
                                        <img
                                            src={Array.isArray(song.image) ? song.image[0]?.url : song.image}
                                            alt=""
                                            className="w-10 h-10 rounded object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{song.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{song.primaryArtists}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dispatch(reorderQueue([...songs, song]));
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 rounded transition-opacity text-xs"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Queue;
