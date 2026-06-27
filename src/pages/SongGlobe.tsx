import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAppSelector } from '../hooks/redux';
import { IoGlobeOutline } from 'react-icons/io5';
import { musicApi } from '../services/musicApi';
import { Song } from '../types/music';

const GlobeScene = lazy(() => import('../components/globe/GlobeScene'));

const SongGlobe: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);
    const [activeCategory, setActiveCategory] = useState(language);
    const [apiSongs, setApiSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch API songs once when language or category changes
    useEffect(() => {
        const fetchGlobeSongs = async () => {
            try {
                setLoading(true);

                const queries = [
                    { query: activeCategory + ' Top Hits', page: 0 },
                    { query: activeCategory + ' Top Hits', page: 1 },
                    { query: activeCategory + ' Top Hits', page: 2 },
                    { query: activeCategory + ' New Songs', page: 0 },
                    { query: activeCategory + ' New Songs', page: 1 },
                    { query: activeCategory + ' New Songs', page: 2 },
                    { query: activeCategory + ' Trending', page: 0 },
                    { query: activeCategory + ' Trending', page: 1 },
                    { query: activeCategory + ' Trending', page: 2 },
                    { query: activeCategory + ' Popular', page: 0 },
                    { query: activeCategory + ' Popular', page: 1 }
                ];

                const results = await Promise.allSettled(queries.map(q => musicApi.searchSongs(q.query, q.page, 40)));
                const allSongs = results
                    .filter((res): res is PromiseFulfilledResult<Song[]> => res.status === 'fulfilled')
                    .flatMap(res => res.value);
                setApiSongs(allSongs);
            } catch (error) {
                console.error('Error fetching globe songs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGlobeSongs();
    }, [activeCategory]);

    // Compute combined unique songs
    const songs = React.useMemo(() => {
        const combined = [
            ...recentlyPlayed.map(s => ({ ...s, globeType: 'recent' })),
            ...apiSongs.map(s => ({ ...s, globeType: activeCategory === 'Trending' ? 'trending' : 'normal' }))
        ];
        const seen = new Set();
        return combined.filter(song => {
            if (seen.has(song.id)) return false;
            seen.add(song.id);
            return true;
        }).slice(0, 800);
    }, [recentlyPlayed, apiSongs, activeCategory]);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pt-0 md:pt-0">
            <div className="absolute top-[calc(var(--navbar-height,80px)+24px)] left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary backdrop-blur-md border border-white/10">
                        <IoGlobeOutline className="text-lg sm:text-xl" />
                    </div>
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white drop-shadow-lg">Song Globe</h1>
                </div>
                <p className="text-[10px] sm:text-sm text-gray-400 leading-tight max-w-xs mb-4">
                    Explore a world of music. Rotate the globe to discover {activeCategory} hits.
                </p>

                <div className="flex flex-wrap gap-2 pointer-events-auto max-w-[280px] sm:max-w-md">
                    {['Trending', 'Telugu', 'Hindi', 'Punjabi', 'English', 'Tamil'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat === 'Trending' ? language : cat)}
                            className={`px-3 py-1 rounded-full border text-[10px] sm:text-xs font-medium transition-all duration-300 backdrop-blur-md ${
                                (cat === 'Trending' && activeCategory === language) || activeCategory === cat
                                ? 'bg-primary border-primary text-black'
                                : 'bg-black/20 border-white/10 text-white/60 hover:bg-black/40'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center h-full text-white">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium animate-pulse">Initializing Virtual World...</p>
                    </div>
                </div>
            }>
                {!loading && <GlobeScene songs={songs} />}
            </Suspense>
        </div>
    );
};

export default SongGlobe;
