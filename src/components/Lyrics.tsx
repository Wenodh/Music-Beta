import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { lyrics as lyricsUrl } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import { useAppSelector } from '../hooks/redux';
import { parseLRC, LyricLine } from '../utils/lrcParser';

interface LyricsProps {
    songId: string;
    songName: string;
    artistName: string;
    isOpen: boolean;
    onClose: () => void;
}

const Lyrics: React.FC<LyricsProps> = ({ songId, songName, artistName, isOpen, onClose }) => {
    const [rawLyrics, setRawLyrics] = useState<string | null>(null);
    const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);

    const { currentTime } = useAppSelector(state => state.musicPlayer);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (isOpen && songId) {
            const fetchLyrics = async () => {
                setLoading(true);
                setActiveLineIndex(-1);
                setParsedLyrics([]);

                try {
                    // Try primary source (JioSaavn API)
                    const res = await axios.get(`${lyricsUrl}${songId}/lyrics`);
                    if (res.data?.data?.lyrics) {
                        const lyricsText = res.data.data.lyrics;
                        setRawLyrics(lyricsText);
                        // Saavn usually provides plain text, but let's try parsing just in case
                        const parsed = parseLRC(lyricsText);
                        setParsedLyrics(parsed);
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
                        // Find best match (synced prefered)
                        const bestMatch = lrcRes.data.find((l: any) => l.syncedLyrics) || lrcRes.data[0];
                        const lyricsText = bestMatch.syncedLyrics || bestMatch.plainLyrics || 'Lyrics not available.';
                        setRawLyrics(lyricsText);
                        const parsed = parseLRC(lyricsText);
                        setParsedLyrics(parsed);
                    } else {
                        setRawLyrics('Lyrics not available for this song.');
                        setParsedLyrics([]);
                    }
                } catch (error) {
                    console.error('Lyrics fetch error:', error);
                    setRawLyrics('Lyrics not available for this song.');
                    setParsedLyrics([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchLyrics();
        }
    }, [isOpen, songId, songName, artistName]);

    // Handle Active Line & Auto Scroll
    useEffect(() => {
        if (parsedLyrics.length > 0) {
            const index = parsedLyrics.findIndex((line, i) => {
                const nextLine = parsedLyrics[i + 1];
                return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
            });

            if (index !== -1 && index !== activeLineIndex) {
                setActiveLineIndex(index);

                // Scroll into view
                const activeElement = lineRefs.current[index];
                if (activeElement && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const offsetTop = activeElement.offsetTop;
                    const containerHeight = container.offsetHeight;

                    container.scrollTo({
                        top: offsetTop - containerHeight / 2 + activeElement.offsetHeight / 2,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [currentTime, parsedLyrics, activeLineIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col text-white overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 md:px-12 z-10">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Now Playing</h2>
                            <p className="text-xl font-bold truncate max-w-[200px] md:max-w-md">{songName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
                        >
                            <IoClose size={28} />
                        </button>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto px-6 md:px-12 py-12 custom-scrollbar scroll-smooth"
                    >
                        <div className="max-w-4xl mx-auto w-full">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-400 font-medium">Fetching synchronized lyrics...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 md:gap-10 pb-40">
                                    {parsedLyrics.length > 0 ? (
                                        parsedLyrics.map((line, index) => (
                                            <motion.div
                                                key={index}
                                                ref={el => lineRefs.current[index] = el}
                                                animate={{
                                                    opacity: activeLineIndex === index ? 1 : 0.3,
                                                    scale: activeLineIndex === index ? 1.05 : 1,
                                                    filter: activeLineIndex === index ? 'blur(0px)' : 'blur(1px)'
                                                }}
                                                className={`text-3xl md:text-5xl font-extrabold leading-tight cursor-pointer transition-all duration-500 origin-left ${
                                                    activeLineIndex === index ? 'text-white' : 'text-white/40 hover:text-white/60'
                                                }`}
                                                onClick={() => {
                                                    const audio = document.querySelector('audio');
                                                    if (audio) audio.currentTime = line.time;
                                                }}
                                            >
                                                {line.text}
                                            </motion.div>
                                        ))
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="whitespace-pre-line text-3xl md:text-5xl font-bold leading-tight text-center bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
                                        >
                                            {rawLyrics}
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="h-1.5 w-full bg-white/10">
                        <motion.div
                            className="h-full bg-primary"
                            style={{ width: `${(currentTime / (parseFloat(document.querySelector('audio')?.duration?.toString() || '1') || 1)) * 100}%` }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Lyrics;
