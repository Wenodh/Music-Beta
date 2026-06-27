import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../hooks/redux';
import { AnimatePresence } from 'framer-motion';
import { IoCompassOutline, IoSearchOutline } from 'react-icons/io5';
import { musicApi } from '../services/musicApi';
import ExploreSongCard from '../components/ExploreSongCard';
import ExploreSkeleton from '../components/ExploreSkeleton';
import { Song } from '../types/music';
import { useMasonryColumns } from '../hooks/useMasonryColumns';

const Explore: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const hasMoreRef = useRef(true);
    const observer = useRef<IntersectionObserver | null>(null);
    const isFetching = useRef(false);
    const columns = useMasonryColumns();

    const updateHasMore = useCallback((value: boolean) => {
        hasMoreRef.current = value;
        setHasMore(value);
    }, []);

    const fetchSongs = useCallback(async (pageNum: number, isReset = false) => {
        if (isFetching.current || (!hasMoreRef.current && !isReset)) return;

        try {
            isFetching.current = true;
            setLoading(true);
            const query = language;
            const newSongs = await musicApi.searchSongs(query, pageNum, 30);

            if (newSongs.length === 0) {
                updateHasMore(false);
            } else {
                setSongs(prev => isReset ? newSongs : [...prev, ...newSongs]);
            }
        } catch (error) {
            console.error('Error fetching explore songs:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [language, updateHasMore]);

    useEffect(() => {
        // Reset and fetch when language changes
        updateHasMore(true);
        fetchSongs(0, true);
    }, [language, fetchSongs, updateHasMore]);

    const lastSongElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isFetching.current) {
                const nextPage = Math.floor(songs.length / 30);
                fetchSongs(nextPage);
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
            <header className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                        <IoCompassOutline className="text-lg sm:text-xl" />
                    </div>
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Explore</h1>
                </div>
                <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 leading-tight max-w-2xl">
                    Discover new music in <span className="text-primary font-medium capitalize">{language}</span> curated just for you.
                </p>
            </header>

            {/* Masonry Grid */}
            {songs.length === 0 && loading ? (
                <ExploreSkeleton />
            ) : (
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
                    <IoSearchOutline size={64} className="text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold">No songs found</h2>
                    <p className="text-gray-500">Try changing your language in settings.</p>
                </div>
            )}
        </div>
    );
};

export default Explore;
