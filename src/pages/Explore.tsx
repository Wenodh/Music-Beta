import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCompassOutline, IoSearchOutline } from 'react-icons/io5';
import { songs as songsUrl } from '../constants';
import ExploreSongCard from '../components/ExploreSongCard';
import ExploreSkeleton from '../components/ExploreSkeleton';
import { Song } from '../types/music';

const Explore: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const [songs, setSongs] = useState<Song[]>([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);
    const isFetching = useRef(false);

    const fetchSongs = useCallback(async (pageNum: number, isReset = false) => {
        if (isFetching.current || (!hasMore && !isReset)) return;

        try {
            isFetching.current = true;
            setLoading(true);
            const query = language;
            const res = await axios.get(`${songsUrl}?query=${encodeURIComponent(query)}&page=${pageNum}&limit=30`);
            const newSongs = res.data.data.results || [];

            if (newSongs.length === 0) {
                setHasMore(false);
            } else {
                setSongs(prev => isReset ? newSongs : [...prev, ...newSongs]);
            }
        } catch (error) {
            console.error('Error fetching explore songs:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [language, hasMore]);

    useEffect(() => {
        // Reset and fetch when language changes
        setPage(0);
        setHasMore(true);
        fetchSongs(0, true);
    }, [language]); // Removed fetchSongs from deps as language is the trigger

    const lastSongElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isFetching.current) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchSongs(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchSongs]);

    return (
        <div className="pb-32 pt-1 px-1 sm:px-4 sm:pt-4">
            <header className="mb-4 px-1.5">
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
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
                    <AnimatePresence>
                        {songs.map((song, index) => (
                            <ExploreSongCard
                                key={`${song.id}-${index}`}
                                song={song}
                                index={index}
                            />
                        ))}
                    </AnimatePresence>
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
                    You've reached the end of the musical universe.
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
