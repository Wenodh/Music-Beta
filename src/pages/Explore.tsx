import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../hooks/redux';
import { AnimatePresence } from 'framer-motion';
import { IoCompassOutline, IoSearchOutline, IoRadioOutline, IoGlobeOutline, IoLanguageOutline, IoPricetagOutline } from 'react-icons/io5';
import { audioSDK } from '../lib/audio-sdk';
import { mediaItemToSong } from '../lib/adapters/mediaItemAdapter';
import { RadioBrowserProvider } from '../lib/audio-sdk/providers/radio-browser';
import ExploreSongCard from '../components/ExploreSongCard';
import ExploreSkeleton from '../components/ExploreSkeleton';
import { Song } from '../types/music';
import { MediaItem } from '../lib/audio-sdk/models';
import { useMasonryColumns } from '../hooks/useMasonryColumns';

const Explore: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const [activeTab, setActiveTab] = useState<'music' | 'radio'>('music');
    const [songs, setSongs] = useState<Song[]>([]);
    const [radioStations, setRadioStations] = useState<MediaItem[]>([]);
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

            if (activeTab === 'music') {
                const query = language;
                const mediaItems = await audioSDK.search(query, { page: pageNum, limit: 30 });
                const newSongs = mediaItems.map(item => mediaItemToSong(item));

                if (newSongs.length === 0) {
                    updateHasMore(false);
                } else {
                    setSongs(prev => isReset ? newSongs : [...prev, ...newSongs]);
                }
            } else {
                const items = await audioSDK.search(language, { page: pageNum, limit: 30, type: 'radio' });

                if (items.length === 0) {
                    updateHasMore(false);
                } else {
                    setRadioStations(prev => isReset ? items : [...prev, ...items]);
                }
            }
        } catch (error) {
            console.error('Error fetching explore songs:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [language, updateHasMore, activeTab]);

    useEffect(() => {
        // Reset and fetch when language or tab changes
        setSongs([]);
        setRadioStations([]);
        updateHasMore(true);
        fetchSongs(0, true);
    }, [language, fetchSongs, updateHasMore, activeTab]);

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

    // Distribute items into columns for a stable masonry effect
    const distributedSongs = Array.from({ length: columns }, (_, i) =>
        songs.filter((_, index) => index % columns === i)
    );

    const distributedRadio = Array.from({ length: columns }, (_, i) =>
        radioStations.filter((_, index) => index % columns === i)
    );

    return (
        <div className="pb-32 pt-1 px-2 sm:px-4 sm:pt-4 gpu-accelerated contain-layout overflow-y-auto custom-scrollbar h-full">
            <header className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg text-primary" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }}>
                                <IoCompassOutline className="text-lg sm:text-xl" />
                            </div>
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Explore</h1>
                        </div>
                        <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 leading-tight max-w-2xl">
                            Discover new music in <span className="text-primary font-medium capitalize">{language}</span> curated just for you.
                        </p>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-center">
                        <button
                            onClick={() => setActiveTab('music')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'music' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Music
                        </button>
                        <button
                            onClick={() => setActiveTab('radio')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'radio' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <IoRadioOutline /> Radio
                        </button>
                    </div>
                </div>

                {activeTab === 'radio' && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap transition-colors">
                            <IoGlobeOutline /> Countries
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap transition-colors">
                            <IoLanguageOutline /> Languages
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap transition-colors">
                            <IoPricetagOutline /> Genres
                        </button>
                    </div>
                )}
            </header>

            {/* Masonry Grid */}
            {((activeTab === 'music' && songs.length === 0) || (activeTab === 'radio' && radioStations.length === 0)) && loading ? (
                <ExploreSkeleton />
            ) : (
                <div className="flex gap-2 sm:gap-3 lg:gap-4 items-start">
                    {activeTab === 'music' ? (
                        distributedSongs.map((columnSongs, colIndex) => (
                            <div key={colIndex} className="flex-1 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                                <AnimatePresence mode="popLayout">
                                    {columnSongs.map((song) => {
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
                        ))
                    ) : (
                        distributedRadio.map((columnStations, colIndex) => (
                            <div key={colIndex} className="flex-1 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                                <AnimatePresence mode="popLayout">
                                    {columnStations.map((station) => {
                                        const globalIndex = radioStations.findIndex(s => s.id === station.id);
                                        // Convert MediaItem to Song for temporary reuse of ExploreSongCard
                                        const songFromStation = mediaItemToSong(station);
                                        return (
                                            <ExploreSongCard
                                                key={`${station.id}-${globalIndex}`}
                                                song={songFromStation}
                                                index={globalIndex}
                                            />
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ))
                    )}
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

            {!hasMore && (activeTab === 'music' ? songs.length > 0 : radioStations.length > 0) && (
                <div className="text-center py-12 text-gray-500">
                    You&apos;ve reached the end of the musical universe.
                </div>
            )}

            {(activeTab === 'music' ? songs.length === 0 : radioStations.length === 0) && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <IoSearchOutline size={64} className="text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold">{activeTab === 'music' ? 'No songs found' : 'No stations found'}</h2>
                    <p className="text-gray-500">Try changing your language in settings.</p>
                </div>
            )}
        </div>
    );
};

export default Explore;
