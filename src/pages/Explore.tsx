import { logger } from "../lib/logger";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../hooks/redux';
import { AnimatePresence } from 'framer-motion';
import { IoCompassOutline, IoSearchOutline, IoRadioOutline, IoGlobeOutline, IoLanguageOutline, IoPricetagOutline } from 'react-icons/io5';
import { audioSDK } from '../lib/audio-sdk';
import { providerRegistry } from '../lib/audio-sdk/registry';
import { mediaItemToSong } from '../lib/adapters/mediaItemAdapter';
import { RadioBrowserProvider } from '../lib/audio-sdk/providers/radio-browser';
import ExploreSongCard from '../components/ExploreSongCard';
import ExploreSkeleton from '../components/ExploreSkeleton';
import { Song } from '../types/music';
import { MediaItem } from '../lib/audio-sdk/models';
import { useMasonryColumns } from '../hooks/useMasonryColumns';

const Explore: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const [activeTab, setActiveTab] = useState<'music' | 'radio' | 'podcasts' | 'audiobooks'>('music');
    const [songs, setSongs] = useState<Song[]>([]);
    const [radioStations, setRadioStations] = useState<MediaItem[]>([]);
    const [metadataList, setMetadataList] = useState<any[]>([]);
    const [activeMetadataType, setActiveMetadataType] = useState<'countries' | 'languages' | 'tags' | null>(null);
    const [selectedMetadata, setSelectedMetadata] = useState<string | null>(null);
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
            } else if (activeTab === 'radio') {
                const radioProvider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
                let items: MediaItem[] = [];

                if (selectedMetadata && activeMetadataType) {
                    // Search by metadata
                    const endpoint = activeMetadataType === 'countries' ? `stations/bycountry/${encodeURIComponent(selectedMetadata)}` :
                                   activeMetadataType === 'languages' ? `stations/bylanguage/${encodeURIComponent(selectedMetadata)}` :
                                   `stations/bytag/${encodeURIComponent(selectedMetadata)}`;

                    // Direct fetch since SDK search is more general
                    const results = await (radioProvider as any).fetchApi(endpoint, {
                        limit: 30,
                        offset: pageNum * 30,
                        hidebroken: 'true',
                        order: 'clickcount',
                        reverse: 'true'
                    });
                    items = results.map((s: any) => (radioProvider as any).mapToMediaItem(s));
                } else {
                    items = await audioSDK.search(language, { page: pageNum, limit: 30, type: 'radio' });
                }

                if (items.length === 0) {
                    updateHasMore(false);
                } else {
                    setRadioStations(prev => isReset ? items : [...prev, ...items]);
                }
            } else if (activeTab === 'podcasts') {
                const items = await audioSDK.searchPodcasts(language, { page: pageNum, limit: 30 });
                if (items.length === 0) {
                    updateHasMore(false);
                } else {
                    const newSongs = items.map(item => mediaItemToSong(item));
                    setSongs(prev => isReset ? newSongs : [...prev, ...newSongs]);
                }
            } else if (activeTab === 'audiobooks') {
                const items = await audioSDK.searchAudiobooks(language, { page: pageNum, limit: 30 });
                if (items.length === 0) {
                    updateHasMore(false);
                } else {
                    const newSongs = items.map(item => mediaItemToSong(item));
                    setSongs(prev => isReset ? newSongs : [...prev, ...newSongs]);
                }
            }
        } catch (error) {
            logger.error('Error fetching explore songs:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [language, updateHasMore, activeTab, selectedMetadata, activeMetadataType]);

    useEffect(() => {
        // Reset and fetch when language or tab changes
        setSongs([]);
        setRadioStations([]);
        setSelectedMetadata(null);
        setActiveMetadataType(null);
        setMetadataList([]);
        updateHasMore(true);
        fetchSongs(0, true);
    }, [language, fetchSongs, updateHasMore, activeTab]);

    const fetchMetadata = async (type: 'countries' | 'languages' | 'tags') => {
        const radioProvider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
        if (!radioProvider) return;

        setLoading(true);
        try {
            let list = [];
            if (type === 'countries') list = await radioProvider.getCountries();
            else if (type === 'languages') list = await radioProvider.getLanguages();
            else if (type === 'tags') list = await radioProvider.getTags();

            // Filter out empty names and sort by station count
            list = list.filter((i: any) => i.name).sort((a: any, b: any) => b.stationcount - a.stationcount);
            setMetadataList(list);
            setActiveMetadataType(type);
        } catch (error) {
            logger.error('Error fetching metadata:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMetadataSelect = (name: string) => {
        setSelectedMetadata(name);
        setRadioStations([]);
        updateHasMore(true);
        setMetadataList([]); // Hide list
        fetchSongs(0, true);
    };

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

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-center overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('music')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'music' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Music
                        </button>
                        <button
                            onClick={() => setActiveTab('radio')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'radio' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <IoRadioOutline /> Radio
                        </button>
                        <button
                            onClick={() => setActiveTab('podcasts')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'podcasts' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Podcasts
                        </button>
                        <button
                            onClick={() => setActiveTab('audiobooks')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'audiobooks' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Audiobooks
                        </button>
                    </div>
                </div>

                {activeTab === 'radio' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <button
                                onClick={() => activeMetadataType === 'countries' ? setActiveMetadataType(null) : fetchMetadata('countries')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeMetadataType === 'countries' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <IoGlobeOutline /> {selectedMetadata && activeMetadataType === 'countries' ? selectedMetadata : 'Countries'}
                            </button>
                            <button
                                onClick={() => activeMetadataType === 'languages' ? setActiveMetadataType(null) : fetchMetadata('languages')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeMetadataType === 'languages' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <IoLanguageOutline /> {selectedMetadata && activeMetadataType === 'languages' ? selectedMetadata : 'Languages'}
                            </button>
                            <button
                                onClick={() => activeMetadataType === 'tags' ? setActiveMetadataType(null) : fetchMetadata('tags')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeMetadataType === 'tags' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <IoPricetagOutline /> {selectedMetadata && activeMetadataType === 'tags' ? selectedMetadata : 'Genres'}
                            </button>

                            {selectedMetadata && (
                                <button
                                    onClick={() => {
                                        setSelectedMetadata(null);
                                        setActiveMetadataType(null);
                                        setRadioStations([]);
                                        updateHasMore(true);
                                        fetchSongs(0, true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                                >
                                    <IoClose /> Clear Filter
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {metadataList.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 max-h-48 overflow-y-auto custom-scrollbar">
                                        {metadataList.slice(0, 50).map((item) => (
                                            <button
                                                key={item.name}
                                                onClick={() => handleMetadataSelect(item.name)}
                                                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                                            >
                                                {item.name}
                                                <span className="text-[10px] text-gray-400">{item.stationcount}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
