import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import { IoGlobeOutline } from 'react-icons/io5';
import { songs as songsUrl, modules } from '../constants';
import { Song } from '../types/music';

const GlobeScene = lazy(() => import('../components/globe/GlobeScene'));

const SongGlobe: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);
    const [apiSongs, setApiSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch API songs once when language changes
    useEffect(() => {
        const fetchGlobeSongs = async () => {
            try {
                setLoading(true);

                const queries = [
                    `${songsUrl}?query=${encodeURIComponent(language + ' Top Hits')}&page=0&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Top Hits')}&page=1&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Top Hits')}&page=2&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' New Songs')}&page=0&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' New Songs')}&page=1&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' New Songs')}&page=2&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Trending')}&page=0&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Trending')}&page=1&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Trending')}&page=2&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Popular')}&page=0&limit=40`,
                    `${songsUrl}?query=${encodeURIComponent(language + ' Popular')}&page=1&limit=40`
                ];

                const results = await Promise.all(queries.map(q => axios.get(q)));
                const allSongs = results.flatMap(res => res.data.data.results || []);
                setApiSongs(allSongs);
            } catch (error) {
                console.error('Error fetching globe songs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGlobeSongs();
    }, [language]);

    // Compute combined unique songs
    const songs = React.useMemo(() => {
        const combined = [...recentlyPlayed, ...apiSongs];
        const seen = new Set();
        return combined.filter(song => {
            if (seen.has(song.id)) return false;
            seen.add(song.id);
            return true;
        }).slice(0, 800);
    }, [recentlyPlayed, apiSongs]);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pt-0 md:pt-0">
            <div className="absolute top-32 left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary backdrop-blur-md border border-white/10">
                        <IoGlobeOutline className="text-lg sm:text-xl" />
                    </div>
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white drop-shadow-lg">Song Globe</h1>
                </div>
                <p className="text-[10px] sm:text-sm text-gray-400 leading-tight max-w-xs">
                    Explore a world of music. Rotate the globe to discover {language} hits.
                </p>
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
