import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCompassOutline, IoSearchOutline } from 'react-icons/io5';
import { songs as songsUrl } from '../constants';
import ExploreSongCard from '../components/ExploreSongCard';
import { Song } from '../types/music';

const Explore: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const [songs, setSongs] = useState<Song[]>([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);

    const fetchSongs = useCallback(async (pageNum: number, ignoreHasMore = false) => {
        if (loading || (!hasMore && !ignoreHasMore)) return;

        try {
            setLoading(true);
            // Using a mix of language and trending queries for variety
            const query = language;
            const res = await axios.get(`${songsUrl}?query=${encodeURIComponent(query)}&page=${pageNum}&limit=30`);
            const newSongs = res.data.data.results || [];

            if (newSongs.length === 0) {
                setHasMore(false);
            } else {
                setSongs(prev => [...prev, ...newSongs]);
            }
        } catch (error) {
            console.error('Error fetching explore songs:', error);
        } finally {
            setLoading(false);
        }
    }, [language, loading, hasMore]);

    useEffect(() => {
        // Reset and fetch when language changes
        setSongs([]);
        setPage(0);
        setHasMore(true);
        fetchSongs(0, true);
    }, [language, fetchSongs]);

    const lastSongElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
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
        <div className="pb-32 pt-4 px-4">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <IoCompassOutline size={28} />
                    </div>
                    <h1 className="text-3xl font-bold">Explore</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                    Discover new music in {language} curated just for you.
                </p>
            </header>

            {/* Masonry Grid */}
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
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

            {/* Loading Indicator */}
            {loading && (
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
