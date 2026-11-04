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

    // In-memory & LocalStorage lyrics cache
    useEffect(() => {
        if (isOpen && songId) {
            const cacheKey = `vibeon_lyrics_${songId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsedData = JSON.parse(cached);
                    setRawLyrics(parsedData.raw);
                    setParsedLyrics(parsedData.parsed);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.warn('Failed parsing cached lyrics', e);
                }
            }

            const fetchLyrics = async () => {
                setLoading(true);
                setActiveLineIndex(-1);
                setParsedLyrics([]);
                lineRefs.current.clear();

                // 1. First priority: LRCLIB for rich synced lyrics
                try {
                    const query = encodeURIComponent(`${songName} ${artistName}`);
                    const lrcRes = await axios.get(`https://lrclib.net/api/search?q=${query}`, { timeout: 4000 });

                    if (lrcRes.data && lrcRes.data.length > 0) {
                        const bestMatch = lrcRes.data.find((l: any) => l.syncedLyrics) || lrcRes.data[0];
                        const lyricsText = bestMatch.syncedLyrics || bestMatch.plainLyrics;
                        if (lyricsText) {
                            const parsed = parseLRC(lyricsText);
                            setRawLyrics(lyricsText);
                            setParsedLyrics(parsed);
                            try {
                                localStorage.setItem(cacheKey, JSON.stringify({ raw: lyricsText, parsed }));
                            } catch (e) {
                                console.warn('Could not cache lyrics', e);
                            }
                            setLoading(false);
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('LRCLIB query failed or timed out, trying fallback provider...', err);
                }

                // 2. Secondary fallback: JioSaavn lyrics API
                try {
                    const res = await axios.get(`${lyricsUrl}${songId}/lyrics`, { timeout: 4000 });
                    if (res.data?.data?.lyrics) {
                        const lyricsText = res.data.data.lyrics;
                        const parsed = parseLRC(lyricsText);
                        setRawLyrics(lyricsText);
                        setParsedLyrics(parsed);
                        try {
                            localStorage.setItem(cacheKey, JSON.stringify({ raw: lyricsText, parsed }));
                        } catch (e) {
                            console.warn('Could not cache lyrics', e);
                        }
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.warn('Secondary lyrics source unavailable:', error);
                }

                // Both failed
                setRawLyrics('Lyrics not available for this song.');
                setParsedLyrics([]);
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

                    container.scrollTo({
                        top: elementTop - (containerHeight / 2) + (elementHeight / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [currentTime, parsedLyrics, activeLineIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="h-full flex flex-col text-white overflow-hidden relative"
                >
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto px-2 md:px-4 py-8 custom-scrollbar scroll-smooth z-10 relative"
                    >
                        <div className="max-w-4xl mx-auto w-full">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-400 font-medium">Fetching synchronized lyrics...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 md:gap-6 pb-20">
                                    {parsedLyrics.length > 0 ? (
                                        parsedLyrics.map((line, index) => (
                                            <motion.div
                                                key={index}
                                                ref={el => { if (el) lineRefs.current.set(index, el); }}
                                                animate={{
                                                    opacity: activeLineIndex === index ? 1 : 0.2,
                                                    scale: activeLineIndex === index ? 1 : 0.95,
                                                    color: activeLineIndex === index ? theme.accentColor : 'rgba(255, 255, 255, 1)'
                                                }}
                                                className="text-2xl md:text-4xl font-black leading-tight cursor-pointer transition-all duration-500 origin-left tracking-tight"
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
                                            className="whitespace-pre-line text-2xl md:text-3xl font-bold leading-tight text-center bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
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
