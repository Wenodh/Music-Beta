import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoTrashOutline } from 'react-icons/io5';
import { clearQueue, setQueueOpen } from '../features/musicplayer/musicPlayerSlice';
import { QueueContent } from './QueueContent';

export { QueueContent };

const Queue: React.FC = () => {
    const { songs, isQueueOpen } = useAppSelector((state) => state.musicPlayer);
    const dispatch = useAppDispatch();

    return (
        <AnimatePresence>
            {isQueueOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(setQueueOpen(false))}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full xs:w-80 bg-white dark:bg-gray-900 shadow-2xl z-[310] border-l border-gray-200 dark:border-gray-800 flex flex-col"
                    >
                        <div className="p-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold">Queue</h2>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{songs.length} Songs</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {songs.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Clear all songs from queue?')) {
                                                dispatch(clearQueue());
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                                        title="Clear Queue"
                                    >
                                        <IoTrashOutline size={20} />
                                    </button>
                                )}
                                <button onClick={() => dispatch(setQueueOpen(false))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                    <IoClose size={24} />
                                </button>
                            </div>
                        </div>

                        <QueueContent />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Queue;
