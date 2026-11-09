import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../hooks/redux';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { IoCompassOutline, IoSearchOutline, IoRefreshOutline, IoPeopleOutline } from 'react-icons/io5';
import ExploreSongCard from '../components/ExploreSongCard';
import ExploreSkeleton from '../components/ExploreSkeleton';
import { Song } from '../types/music';
import { useMasonryColumns } from '../hooks/useMasonryColumns';
import { musicApiService } from '../services/musicApiService';

export const EXPLORE_LANGUAGES = [
    { name: 'Telugu', value: 'telugu' },
    { name: 'Hindi', value: 'hindi' },
    { name: 'English', value: 'english' },
    { name: 'Tamil', value: 'tamil' },
    { name: 'Punjabi', value: 'punjabi' },
];

const Explore: React.FC = () => {
    const { language: globalLanguage } = useAppSelector((state) => state.language);
    // Local Explore-only language filter initialized with the user's default language
    const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
        const normalized = (globalLanguage || 'telugu').toLowerCase();
        return EXPLORE_LANGUAGES.some(l => l.value === normalized) ? normalized : 'telugu';
    });
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCached, setIsCached] = useState(false);
    const hasMoreRef = useRef(true);
    const observer = useRef<IntersectionObserver | null>(null);
    const isFetching = useRef(false);
    const columns = useMasonryColumns();
    const abortControllerRef = useRef<AbortController | null>(null);

    const updateHasMore = useCallback((value: boolean) => {
        hasMoreRef.current = value;
        setHasMore(value);
    }, []);

    const fetchSongs = useCallback(async (pageNum: number, isReset = false, signal?: AbortSignal) => {
        if (isFetching.current && !isReset) return;
        if (!hasMoreRef.current && !isReset) return;

        try {
            isFetching.current = true;
            setLoading(true);
            setError(null);
            if (isReset) {
                setSongs([]); // Clear stale results immediately to show skeleton
            }
            const query = selectedLanguage;
            const path = `/api/search/songs?query=${encodeURIComponent(query)}&page=${pageNum}&limit=30`;
            const res = await musicApiService.fetchWithFallback(path, { signal, timeout: 7000 });
            setIsCached(res.isCached);
            const newSongs = res.data?.data?.results || res.data?.results || [];

            if (signal?.aborted) return;

            if (newSongs.length === 0) {
                updateHasMore(false);
            } else {
                setSongs(prev => isReset ? newSongs : [...prev, ...newSongs]);
            }
        } catch (err: any) {
            if (err?.name === 'CanceledError' || signal?.aborted) {
                return;
            }
            console.error('Error fetching explore songs:', err);
            setError('Could not load songs for this category.');
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
                isFetching.current = false;
            }
        }
    }, [selectedLanguage, updateHasMore]);

    useEffect(() => {
        // Reset and fetch when language changes
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        updateHasMore(true);
        isFetching.current = false;
        fetchSongs(0, true, controller.signal);

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [selectedLanguage, fetchSongs, updateHasMore]);

    const lastSongElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isFetching.current) {
                const nextPage = Math.floor(songs.length / 30);
                const controller = new AbortController();
                abortControllerRef.current = controller;
                fetchSongs(nextPage, false, controller.signal);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchSongs, songs.length]);

    // Distribute songs into columns for a stable masonry effect
    const distributedSongs = Array.from({ length: columns }, (_, i) =>
        songs.filter((_, index) => index % columns === i)
    );

    return (
        <div className="pb-32 pt-1 px-2 sm:px-4 sm:pt-4 gpu-accelerated contain-layout overflow-y-auto custom-scrollbar h-full">
            <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <IoCompassOutline className="text-lg sm:text-xl" />
                        </div>
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Explore</h1>
                    </div>
                    <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 leading-tight max-w-2xl">
                        Discover new music in <span className="text-primary font-medium capitalize">{selectedLanguage}</span> curated just for you.
                    </p>
                </div>

                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
                >
                    <IoPeopleOutline size={16} /> Community Pulse
                </Link>
            </header>

            {/* Language Filter Pills */}
            <div className="mb-4 -mx-2 px-2 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto custom-scrollbar scroll-smooth py-1">
                {EXPLORE_LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguage === lang.value;
                    return (
                        <button
                            key={lang.value}
                            type="button"
                            onClick={() => {
                                if (selectedLanguage !== lang.value) {
                                    setSelectedLanguage(lang.value);
                                }
                            }}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                                isSelected
                                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border border-transparent dark:border-white/5'
                            }`}
                            aria-pressed={isSelected}
                            aria-label={`Filter by ${lang.name}`}
                        >
                            {lang.name}
                        </button>
                    );
                })}
            </div>

            {/* Stale Cache Notice Banner */}
            {isCached && songs.length > 0 && (
                <div className="mb-3 flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl text-xs text-amber-300">
                    <span>Showing saved content while live music servers are updating.</span>
                    <button
                        onClick={() => {
                            const controller = new AbortController();
                            abortControllerRef.current = controller;
                            fetchSongs(0, true, controller.signal);
                        }}
                        className="flex items-center gap-1 font-bold text-amber-400 hover:text-white transition-colors"
                    >
                        <IoRefreshOutline size={14} /> Refresh
                    </button>
                </div>
            )}

            {/* Error with Retry State */}
            {error && songs.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4">
                        <IoRefreshOutline size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-1">Could Not Load Songs</h2>
                    <p className="text-xs text-gray-400 max-w-sm mb-6">{error}</p>
                    <button
                        onClick={() => {
                            const controller = new AbortController();
                            abortControllerRef.current = controller;
                            fetchSongs(0, true, controller.signal);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <IoRefreshOutline size={16} /> Retry
                    </button>
                </div>
            )}

            {/* Masonry Grid */}
            {songs.length === 0 && loading ? (
                <ExploreSkeleton />
            ) : songs.length > 0 && (
                <div className="flex gap-2 sm:gap-3 lg:gap-4 items-start">
                    {distributedSongs.map((columnSongs, colIndex) => (
                        <div key={colIndex} className="flex-1 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                            <AnimatePresence mode="popLayout">
                                {columnSongs.map((song) => {
                                    // Need global index for aspect ratio consistency
                                    const globalIndex = songs.findIndex(s => s.id === song.id);
                                    return (
                                        <ExploreSongCard
                                            key={`${song.id}-${globalIndex}`}
                                            song={song}
                                            index={globalIndex}
                                        />
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading Indicator */}
            {loading && songs.length > 0 && (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Intersection Observer Target */}
            <div ref={lastSongElementRef} className="h-20" />

            {!hasMore && songs.length > 0 && (
                <div className="text-center py-12 text-gray-500">
                    You&apos;ve reached the end of the musical universe.
                </div>
            )}

            {songs.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <IoSearchOutline size={64} className="text-gray-300 dark:text-gray-600 mb-4" />
                    <h2 className="text-xl font-semibold">No songs found</h2>
                    <p className="text-gray-500 mb-4">Try selecting another language filter above.</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {EXPLORE_LANGUAGES.map((lang) => (
                            <button
                                key={lang.value}
                                onClick={() => setSelectedLanguage(lang.value)}
                                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                                    selectedLanguage === lang.value
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                            >
                                {lang.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Explore;
