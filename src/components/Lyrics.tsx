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
    onSeek?: (time: number) => void;
}

const Lyrics: React.FC<LyricsProps> = ({ songId, songName, artistName, isOpen, onClose, onSeek }) => {
    const dispatch = useAppDispatch();
    const [rawLyrics, setRawLyrics] = useState<string | null>(null);
    const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);

    const { currentTime, isPlaying, currentSong } = useAppSelector(state => state.musicPlayer);
    const { theme } = useAppSelector(state => state.ui);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const imageUrl = typeof currentSong?.image === 'string' ? currentSong?.image : currentSong?.image?.[currentSong?.image?.length - 1]?.url;
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    useEffect(() => {
        if (isOpen && songId) {
            const fetchLyrics = async () => {
                setLoading(true);
                setActiveLineIndex(-1);
                setParsedLyrics([]);
                lineRefs.current.clear();

                let foundSynced = false;

                // 1. Try LRCLib first for synced lyrics (Better quality for syncing)
                try {
                    const query = encodeURIComponent(`${songName} ${artistName}`);
                    const lrcRes = await axios.get(`https://lrclib.net/api/search?q=${query}`);

                    if (lrcRes.data && lrcRes.data.length > 0) {
                        // Sort results: syncedLyrics > plainLyrics
                        const bestMatch = lrcRes.data.find((l: any) => l.syncedLyrics) || lrcRes.data[0];

                        if (bestMatch.syncedLyrics) {
                            const parsed = parseLRC(bestMatch.syncedLyrics);
                            if (parsed.length > 0) {
                                setRawLyrics(bestMatch.syncedLyrics);
                                setParsedLyrics(parsed);
                                foundSynced = true;
                            }
                        } else if (bestMatch.plainLyrics) {
                            setRawLyrics(bestMatch.plainLyrics);
                        }
                    }
                } catch (error) {
                    console.warn('LRCLib fetch error:', error);
                }

                // 2. If no synced lyrics found, try JioSaavn (often plain text)
                if (!foundSynced) {
                    try {
                        const res = await axios.get(`${lyricsUrl}${songId}/lyrics`);
                        if (res.data?.data?.lyrics) {
                            const lyricsText = res.data.data.lyrics;
                            const parsed = parseLRC(lyricsText);

                            if (parsed.length > 0) {
                                setRawLyrics(lyricsText);
                                setParsedLyrics(parsed);
                                foundSynced = true;
                            } else if (!rawLyrics) {
                                // Only use if we don't already have plain lyrics from LRCLib
                                setRawLyrics(lyricsText);
                            }
                        }
                    } catch (error) {
                        console.warn('Saavn lyrics fetch error:', error);
                    }
                }

                if (!foundSynced && !rawLyrics) {
                    setRawLyrics('Lyrics not available for this song.');
                    setParsedLyrics([]);
                }

                setLoading(false);
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
                const activeElement = lineRefs.current.get(index);
                if (activeElement && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;

                    const containerHeight = container.clientHeight;
                    const elementTop = activeElement.offsetTop;
                    const elementHeight = activeElement.offsetHeight;

                    // Standard Apple Music style: Keep active line at roughly 1/3 from top
                    container.scrollTo({
                        top: elementTop - (containerHeight * 0.3) + (elementHeight / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [currentTime, parsedLyrics, activeLineIndex]);

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div
                    className="h-full flex flex-col text-white overflow-hidden relative"
                >
                    {/* Gradient Fades for Apple Music look */}
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950/50 to-transparent z-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950/80 to-transparent z-20 pointer-events-none" />

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto px-4 md:px-12 py-32 scroll-smooth z-10 relative no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
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
                                                ref={el => { if (el) lineRefs.current.set(index, el); }}
                                                animate={{
                                                    opacity: activeLineIndex === index ? 1 : 0.3,
                                                    scale: activeLineIndex === index ? 1 : 0.9,
                                                    color: activeLineIndex === index ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                                                    filter: activeLineIndex === index ? 'blur(0px)' : 'blur(2px)'
                                                }}
                                                className={`text-4xl md:text-6xl font-black leading-tight cursor-pointer transition-all duration-700 origin-left tracking-tighter py-3 select-none ${activeLineIndex === index ? 'drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]' : ''}`}
                                                onClick={() => {
                                                    if (onSeek) {
                                                        onSeek(line.time);
                                                    } else {
                                                        const audio = document.querySelector('audio');
                                                        if (audio) audio.currentTime = line.time;
                                                    }
                                                }}
                                            >
                                                {line.text}
                                            </motion.div>
                                        ))
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="whitespace-pre-line text-3xl md:text-5xl font-black leading-snug text-left opacity-40 hover:opacity-100 transition-opacity duration-500 tracking-tighter"
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

                </div>
            )}
        </AnimatePresence>
    );
};

export default Lyrics;
