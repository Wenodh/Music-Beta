import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import { motion } from 'framer-motion';
import { IoCloudOffline, IoArrowForward, IoGameControllerOutline, IoRefreshOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { musicApiService } from '../services/musicApiService';
import { modules, songs as songsUrl, playlistSearch, searchArtist, playlistById } from '../constants';
import { getHomePreferences, subscribeHomePreferences } from '../features/home/homePreferences';

const MainSection: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed, recentlyPlayedAlbums } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<{
        albums: any[];
        songs: any[];
        playlists: any[];
        artists: any[];
        meditation: any[];
        work: any[];
        devPicks: any[];
        chill: any[];
        workout: any[];
        latestSongs: any[];
    }>({
        albums: [],
        songs: [],
        playlists: [],
        artists: [],
        meditation: [],
        work: [],
        devPicks: [],
        chill: [],
        workout: [],
        latestSongs: []
    });
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isStaleData, setIsStaleData] = useState(false);
    const [retryTrigger, setRetryTrigger] = useState(0);
    const [homePreferences, setHomePreferences] = useState(() => getHomePreferences());
    const feedVisibilityKey = JSON.stringify(homePreferences.visible);

    useEffect(() => subscribeHomePreferences(() => setHomePreferences(getHomePreferences())), []);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const fetchData = useCallback(async (signal: AbortSignal) => {
        try {
            setLoading(true);
            setFetchError(null);

            // Curated artists per language
                const curatedArtists: Record<string, string[]> = {
                    telugu: ['Sid Sriram', 'Thaman S', 'Devi Sri Prasad', 'Mani Sharma', 'S. P. Balasubrahmanyam', 'Karthik', 'Anurag Kulkarni', 'Ram Miriyala', 'Mangli', 'Armaan Malik', 'Geetha Madhuri', 'S. Janaki'],
                    hindi: ['Arijit Singh', 'Shreya Ghoshal', 'Badshah', 'Pritam', 'Anirudh Ravichander', 'Jubin Nautiyal', 'Neha Kakkar', 'Atif Aslam', 'Sunidhi Chauhan', 'Vishal Dadlani', 'Amit Trivedi', 'Mohit Chauhan'],
                    punjabi: ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'Guru Randhawa', 'Hardy Sandhu', 'Ammy Virk', 'Jasmine Sandlas', 'Nimrat Khaira', 'Sharry Maan', 'Satinder Sartaaj', 'B Praak'],
                    tamil: ['Anirudh Ravichander', 'A. R. Rahman', 'Yuvan Shankar Raja', 'Santhosh Narayanan', 'G. V. Prakash', 'Harris Jayaraj', 'D. Imman', 'Vijay Antony', 'Hiphop Tamizha', 'Shweta Mohan', 'Sujatha', 'Haricharan'],
                    english: ['Taylor Swift', 'The Weeknd', 'Drake', 'Ed Sheeran', 'Justin Bieber', 'Dua Lipa', 'Bruno Mars', 'Ariana Grande', 'Billie Eilish', 'Post Malone', 'Kendrick Lamar', 'Rihanna', 'Eminem', 'Sia']
                };

                // Keep the first paint lightweight; featured artists are intentionally capped here.
                const artistsToFetch = getHomePreferences().visible.featuredArtists ? (curatedArtists[language.toLowerCase()] || [language]).slice(0, 5) : [];
                const enabled = getHomePreferences().visible;

                // Helper to sanitize base URLs for limit parameter
                const getSanitizedUrl = (baseUrl: string) => {
                    return baseUrl.includes('limit=')
                        ? baseUrl.split('limit=')[0].slice(0, -1)
                        : baseUrl;
                };

                const sanitizedPlaylistSearch = getSanitizedUrl(playlistSearch);
                const sanitizedSearchArtist = getSanitizedUrl(searchArtist);

                const extractPath = (fullUrl: string) => {
                    try {
                        const parsed = new URL(fullUrl);
                        return parsed.pathname + parsed.search;
                    } catch {
                        return fullUrl.replace(/https?:\/\/[^/]+/, '');
                    }
                };

                const fetchFeed = (url: string) => {
                    const path = extractPath(url);
                    return musicApiService.fetchWithFallback(path, { signal }, undefined, { staleWhileRevalidate: true });
                };

                const results = await Promise.allSettled([
                    enabled.trendingAlbums ? fetchFeed(`${modules}${language}&page=0&limit=25`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.trendingSongs ? fetchFeed(`${songsUrl}?query=${encodeURIComponent(language + ' Top Hits')}&page=0&limit=60`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.topPlaylists ? fetchFeed(`${playlistSearch}${language}`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.meditation ? fetchFeed(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Meditation')}&limit=15`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.work ? fetchFeed(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Work')}&limit=15`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.developerPicks ? fetchFeed(`${playlistById}158224644`) : Promise.resolve({ data: { data: { songs: [] } }, provider: 'skipped' }),
                    enabled.chill ? fetchFeed(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Chill')}&limit=15`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.workout ? fetchFeed(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Workout')}&limit=15`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    enabled.latestSongs ? fetchFeed(`${songsUrl}?query=${encodeURIComponent(language + ' New Songs')}&page=0&limit=60`) : Promise.resolve({ data: { data: { results: [] } }, provider: 'skipped' }),
                    ...artistsToFetch.map(name => {
                        return fetchFeed(`${sanitizedSearchArtist}${sanitizedSearchArtist.includes('?') ? '&' : '?'}query=${encodeURIComponent(name)}&limit=1`);
                    })
                ]);

                if (signal.aborted) return;

                const albumsRes = results[0];
                const songsRes = results[1];
                const playlistsRes = results[2];
                const meditationRes = results[3];
                const workRes = results[4];
                const devPicksRes = results[5];
                const chillRes = results[6];
                const workoutRes = results[7];
                const latestSongsRes = results[8];
                const artistsResults = results.slice(9);

                const artistList = artistsResults
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value.data.data.results?.[0])
                    .filter(Boolean);

                const deduplicateSongs = (songs: any[]) => {
                    const seen = new Set();
                    return songs.filter(song => {
                        const id = song.id;
                        if (!id || seen.has(id)) return false;
                        seen.add(id);
                        return true;
                    });
                };

                const rawTrendingSongs = songsRes.status === 'fulfilled' ? (songsRes.value.data.data.results || []) : [];
                const rawLatestSongs = latestSongsRes.status === 'fulfilled' ? (latestSongsRes.value.data.data.results || []) : [];

                // Deduplicate and slice
                const latestSongs = deduplicateSongs(rawLatestSongs).slice(0, 50);
                const trendingSongs = deduplicateSongs(rawTrendingSongs).slice(0, 50);

                setData({
                    albums: albumsRes.status === 'fulfilled' ? (albumsRes.value.data.data.results || []) : [],
                    songs: trendingSongs,
                    playlists: playlistsRes.status === 'fulfilled' ? (playlistsRes.value.data.data.results || []) : [],
                    artists: artistList,
                    meditation: meditationRes.status === 'fulfilled' ? (meditationRes.value.data.data.results || []) : [],
                    work: workRes.status === 'fulfilled' ? (workRes.value.data.data.results || []) : [],
                    devPicks: devPicksRes.status === 'fulfilled' ? (devPicksRes.value.data.data.songs || []) : [],
                    chill: chillRes.status === 'fulfilled' ? (chillRes.value.data.data.results || []) : [],
                    workout: workoutRes.status === 'fulfilled' ? (workoutRes.value.data.data.results || []) : [],
                    latestSongs: latestSongs
                });

                // Show stale content immediately, then patch only the sections that refresh.
                const refreshes: Promise<any>[] = [];
                const refreshField = (result: PromiseSettledResult<any>, field: keyof typeof data, select: (payload: any) => any[]) => {
                    if (result.status !== 'fulfilled' || !result.value.refreshPromise) return;
                    refreshes.push(result.value.refreshPromise.then((freshResponse: any) => {
                        if (signal.aborted) return freshResponse;
                        setData(previous => ({ ...previous, [field]: select(freshResponse.data) }));
                        return freshResponse;
                    }));
                };

                refreshField(albumsRes, 'albums', payload => payload.data?.results || []);
                refreshField(songsRes, 'songs', payload => deduplicateSongs(payload.data?.results || []).slice(0, 50));
                refreshField(playlistsRes, 'playlists', payload => payload.data?.results || []);
                refreshField(meditationRes, 'meditation', payload => payload.data?.results || []);
                refreshField(workRes, 'work', payload => payload.data?.results || []);
                refreshField(devPicksRes, 'devPicks', payload => payload.data?.songs || []);
                refreshField(chillRes, 'chill', payload => payload.data?.results || []);
                refreshField(workoutRes, 'workout', payload => payload.data?.results || []);
                refreshField(latestSongsRes, 'latestSongs', payload => deduplicateSongs(payload.data?.results || []).slice(0, 50));

                artistsResults.forEach((result, index) => {
                    if (result.status !== 'fulfilled' || !result.value.refreshPromise) return;
                    refreshes.push(result.value.refreshPromise.then((freshResponse: any) => {
                        if (signal.aborted) return freshResponse;
                        const freshArtist = freshResponse.data.data?.results?.[0];
                        if (freshArtist) {
                            const previousArtist = result.value.data.data?.results?.[0];
                            const artistName = artistsToFetch[index];
                            setData(previous => {
                                const artists = [...previous.artists];
                                const existingIndex = artists.findIndex(artist =>
                                    (previousArtist?.id && artist.id === previousArtist.id) ||
                                    (artistName && artist.name?.toLowerCase() === artistName.toLowerCase())
                                );
                                if (existingIndex >= 0) artists[existingIndex] = freshArtist;
                                else artists.push(freshArtist);
                                return { ...previous, artists };
                            });
                        }
                        return freshResponse;
                    }));
                });

                // Keep the stale banner until all background refreshes have settled successfully.
                if (refreshes.length) {
                    void Promise.allSettled(refreshes).then(outcomes => {
                        if (signal.aborted) return;
                        const allFresh = outcomes.every(outcome =>
                            outcome.status === 'fulfilled' && outcome.value?.provider !== 'cache'
                        );
                        if (allFresh) setIsStaleData(false);
                    });
                }

                const hasCachedProvider = results.some(r => r.status === 'fulfilled' && (r.value as any).provider === 'cache');
                setIsStaleData(hasCachedProvider);

                // If all major feed requests failed and data is empty, set error
                const allFailed = results.every(r => r.status === 'rejected');
                if (allFailed && trendingSongs.length === 0) {
                    setFetchError('Unable to load trending music. Providers may be experiencing high load.');
                }
            } catch (error: any) {
                if (error?.name === 'CanceledError' || signal.aborted) {
                    return;
                }
                console.error('Error in fetchData:', error);
                setFetchError('Failed to refresh music feed.');
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
    }, [language, feedVisibilityKey]);

    useEffect(() => {
        if (isOffline) return;
        const controller = new AbortController();
        fetchData(controller.signal);

        return () => {
            controller.abort();
        };
    }, [language, isOffline, retryTrigger, fetchData]);

    if (isOffline) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-400"
                >
                    <IoCloudOffline size={48} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">You're Offline</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                    Check your internet connection or listen to your downloaded songs while you wait.
                </p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/library?tab=offline')}
                    className="flex items-center gap-2 bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/30 transition-all"
                >
                    Go to Downloads <IoArrowForward />
                </motion.button>
            </div>
        );
    }

    if (fetchError && (!data.songs || data.songs.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4">
                    <IoRefreshOutline size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Music Feed Unavailable</h3>
                <p className="text-xs text-gray-400 max-w-sm mb-6">{fetchError}</p>
                <button
                    onClick={() => setRetryTrigger(prev => prev + 1)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <IoRefreshOutline size={16} /> Retry Feed
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-32 pt-4 sm:pt-8 px-2 sm:px-4 will-change-transform contain-layout gpu-accelerated"
        >
            {/* Stale Cache Notice Banner */}
            {isStaleData && (
                <div className="mb-4 flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl text-xs text-amber-300">
                    <span>Showing saved content while live music servers are updating.</span>
                    <button
                        onClick={() => setRetryTrigger(prev => prev + 1)}
                        className="flex items-center gap-1 font-bold text-amber-400 hover:text-white transition-colors"
                    >
                        <IoRefreshOutline size={14} /> Refresh
                    </button>
                </div>
            )}

            {homePreferences.order.map((sectionId) => {
                if (!homePreferences.visible[sectionId]) return null;
                const sectionProps = { variants: itemVariants, className: 'mb-8 sm:mb-12' };
                switch (sectionId) {
                    case 'dailyMix':
                        return <DailyMix key={sectionId} />;
                    case 'arcade':
                        return (
                            <motion.div key={sectionId} {...sectionProps} onClick={() => navigate('/arcade')} className="mb-8 cursor-pointer group bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-primary/20 border border-primary/30 hover:border-primary/60 p-4 sm:p-6 rounded-3xl transition-all shadow-lg flex items-center justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-3 bg-primary/20 text-primary rounded-2xl group-hover:scale-110 transition-transform"><IoGameControllerOutline size={28} /></div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">New Mini Games</span>
                                        <h3 className="text-lg sm:text-xl font-black text-white">Vibe Arcade</h3>
                                        <p className="text-xs text-gray-400">Play music-synced retro games while listening to your favorite songs</p>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-primary hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shrink-0">Play</button>
                            </motion.div>
                        );
                    case 'recentlyPlayed':
                        return recentlyPlayed?.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={recentlyPlayed} title="Recently Played Songs" /></motion.div> : null;
                    case 'recentlyPlayedAlbums':
                        return recentlyPlayedAlbums?.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={recentlyPlayedAlbums} title="Recently Played Albums" /></motion.div> : null;
                    case 'latestSongs':
                        return data.latestSongs.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.latestSongs} title="Latest Songs" /></motion.div> : null;
                    case 'trendingSongs':
                        return data.songs.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.songs} title="Trending Songs" /></motion.div> : null;
                    case 'trendingAlbums':
                        return data.albums.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.albums} title="Trending Albums" /></motion.div> : null;
                    case 'featuredArtists':
                        return data.artists.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.artists} title="Featured Artists" /></motion.div> : null;
                    case 'topPlaylists':
                        return data.playlists.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.playlists} title="Top Playlists" /></motion.div> : null;
                    case 'meditation':
                        return data.meditation.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.meditation} title="Meditation" /></motion.div> : null;
                    case 'work':
                        return data.work.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.work} title="Work" /></motion.div> : null;
                    case 'developerPicks':
                        return data.devPicks.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.devPicks} title="Developer's Picks" /></motion.div> : null;
                    case 'chill':
                        return data.chill.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.chill} title="Chill" /></motion.div> : null;
                    case 'workout':
                        return data.workout.length ? <motion.div key={sectionId} {...sectionProps}><Slider data={data.workout} title="Workout" /></motion.div> : null;
                    default:
                        return null;
                }
            })}

        </motion.div>
    );
};

export default MainSection;
