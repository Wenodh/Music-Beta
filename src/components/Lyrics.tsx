import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { lyrics as lyricsUrl } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';

interface LyricsProps {
    songId: string;
    isOpen: boolean;
    onClose: () => void;
}

const Lyrics: React.FC<LyricsProps> = ({ songId, isOpen, onClose }) => {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && songId) {
            const fetchLyrics = async () => {
                setLoading(true);
                try {
                    const res = await axios.get(`${lyricsUrl}${songId}/lyrics`);
                    setLyrics(res.data.data.lyrics);
                } catch (error) {
                    console.error('Lyrics not found');
                    setLyrics('Lyrics not available for this song.');
                } finally {
                    setLoading(false);
                }
            };
            fetchLyrics();
        }
    }, [isOpen, songId]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="fixed inset-0 bottom-[88px] z-[40] bg-black/90 backdrop-blur-xl flex flex-col text-white p-6 md:p-12 overflow-y-auto"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <IoClose size={32} />
                    </button>

                    <div className="max-w-3xl mx-auto w-full pt-12 pb-12">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-400">Loading lyrics...</p>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="whitespace-pre-line text-2xl md:text-4xl font-bold leading-relaxed text-center"
                            >
                                {lyrics}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Lyrics;
