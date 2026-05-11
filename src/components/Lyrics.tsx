import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { lyrics as lyricsUrl } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { parseLRC, LyricLine } from '../utils/lrcParser';
import { playMusic, nextSong, prevSong } from '../features/musicplayer/musicPlayerSlice';

interface LyricsProps {
    songId: string;
    songName: string;
    artistName: string;
    isOpen: boolean;
    onClose: () => void;
}

const Lyrics: React.FC<LyricsProps> = ({ songId, songName, artistName, isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const [rawLyrics, setRawLyrics] = useState<string | null>(null);
    const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);

    const { currentTime, isPlaying, currentSong } = useAppSelector(state => state.musicPlayer);
    const { theme } = useAppSelector(state => state.ui);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const imageUrl = typeof currentSong?.image === 'string' ? currentSong?.image : currentSong?.image?.[currentSong?.image?.length - 1]?.url;
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="min-h-[calc(100vh-160px)] flex flex-col text-white overflow-hidden relative rounded-3xl"
                >
                    {/* Immersive Background */}
                    <div className="absolute inset-0 z-0">
                        <motion.img
                            key={imageUrl}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 0.3, scale: 1 }}
                            src={imageUrl}
                            alt=""
                            className="w-full h-full object-cover blur-[100px] saturate-[1.5]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/40 via-gray-950/80 to-gray-950" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between p-6 md:p-10 z-10">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Lyrics</h2>
                            <p className="text-xl font-bold truncate max-w-[200px] md:max-w-md">{songName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
                            title="Close Lyrics"
                        >
                            <IoClose size={24} />
                        </button>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto px-6 md:px-12 py-8 custom-scrollbar scroll-smooth z-10"
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
                                                    opacity: activeLineIndex === index ? 1 : 0.2,
                                                    scale: activeLineIndex === index ? 1 : 0.95,
                                                    filter: activeLineIndex === index ? 'blur(0px)' : 'blur(2px)',
                                                    color: activeLineIndex === index ? theme.accentColor : 'rgba(255, 255, 255, 1)'
                                                }}
                                                className="text-3xl md:text-6xl font-black leading-tight cursor-pointer transition-all duration-700 origin-left tracking-tight"
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
                        {/* Spacer for player visibility */}
                        <div className="h-32 flex-shrink-0" />
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Lyrics;
