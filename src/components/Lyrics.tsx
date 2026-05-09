import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { lyrics as lyricsUrl } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';

interface LyricsProps {
    songId: string;
    songName: string;
    artistName: string;
    isOpen: boolean;
    onClose: () => void;
}

const Lyrics: React.FC<LyricsProps> = ({ songId, songName, artistName, isOpen, onClose }) => {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && songId) {
            const fetchLyrics = async () => {
                setLoading(true);
                try {
                    // Try primary source (JioSaavn API)
                    const res = await axios.get(`${lyricsUrl}${songId}/lyrics`);
                    if (res.data?.data?.lyrics) {
                        setLyrics(res.data.data.lyrics);
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.warn('Saavn lyrics not found, trying LRCLib...');
                }

                try {
                    // Try fallback source (LRCLib)
                    const query = encodeURIComponent(`${songName} ${artistName}`);
                    const lrcRes = await axios.get(`https://lrclib.net/api/search?q=${query}`);

                    if (lrcRes.data && lrcRes.data.length > 0) {
                        const bestMatch = lrcRes.data[0];
                        setLyrics(bestMatch.plainLyrics || bestMatch.syncedLyrics || 'Lyrics not available.');
                    } else {
                        setLyrics('Lyrics not available for this song.');
                    }
                } catch (error) {
                    console.error('Lyrics fetch error:', error);
                    setLyrics('Lyrics not available for this song.');
                } finally {
                    setLoading(false);
                }
            };
            fetchLyrics();
        }
    }, [isOpen, songId, songName, artistName]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col text-white overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 md:px-12 border-b border-white/10 bg-black/50 backdrop-blur-md z-10">
                        <h2 className="text-xl font-bold">Lyrics</h2>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <IoClose size={28} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 md:px-12 py-12 custom-scrollbar">

                        <div className="max-w-4xl mx-auto w-full">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-400">Searching for lyrics...</p>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="whitespace-pre-line text-3xl md:text-5xl font-bold leading-tight md:leading-snug text-center bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent pb-20"
                                >
                                    {lyrics}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Lyrics;
