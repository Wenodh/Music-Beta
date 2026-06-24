import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloudOffline, IoArrowForward, IoMusicalNotes } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { modules, songs as songsUrl, playlistSearch, searchArtist, playlistById } from '../constants';

const HeroCarousel = ({ items }: { items: any[] }) => {
    const [index, setIndex] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % items.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [items.length]);

    if (!items.length) return null;

    const currentItem = items[index];

    return (
        <div className="relative h-[250px] sm:h-[400px] w-full mb-12 rounded-[2rem] overflow-hidden perspective-1000">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0, scale: 1.1, rotateY: 10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute inset-0 preserve-3d"
                >
                    {/* Background Layer */}
                    <div className="absolute inset-0">
                        <img
                            src={currentItem.image?.[2]?.link || currentItem.image?.[currentItem.image?.length - 1]?.link}
                            alt=""
                            className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
                    </div>

                    {/* Content Layer */}
                    <div className="absolute inset-0 flex flex-col sm:flex-row items-center justify-between px-8 sm:px-16 gap-8">
                        <div className="flex-1 text-center sm:text-left z-10">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4 backdrop-blur-md border border-primary/20"
                            >
                                NEW RELEASE
                            </motion.div>
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl sm:text-6xl font-black tracking-tighter mb-4 text-white drop-shadow-2xl font-display"
                                dangerouslySetInnerHTML={{ __html: currentItem.name || currentItem.title }}
                            />
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-gray-400 text-lg mb-8 line-clamp-2 max-w-xl"
                                dangerouslySetInnerHTML={{ __html: currentItem.subtitle || currentItem.description }}
                            />
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.05, boxShadow: '0 0 20px var(--accent-color)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(currentItem.type === 'album' ? `/albums/${currentItem.id}` : `/playlists/${currentItem.id}`)}
                                className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto sm:mx-0 shadow-lg shadow-primary/30"
                            >
                                Listen Now <IoArrowForward />
                            </motion.button>
                        </div>

                        <motion.div
                            initial={{ x: 40, opacity: 0, rotateY: 20 }}
                            animate={{ x: 0, opacity: 1, rotateY: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="hidden sm:block w-[300px] h-[300px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 preserve-3d group cursor-pointer"
                            onClick={() => navigate(currentItem.type === 'album' ? `/albums/${currentItem.id}` : `/playlists/${currentItem.id}`)}
                        >
                            <img
                                src={currentItem.image?.[currentItem.image?.length - 1]?.link}
                                alt=""
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <IoMusicalNotes size={64} className="text-white drop-shadow-lg" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {items.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1.5 transition-all duration-300 rounded-full ${i === index ? 'w-8 bg-primary' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>
        </div>
    );
};

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

    useEffect(() => {
        if (isOffline) return;
        const fetchData = async () => {
            try {
                setLoading(true);

                const curatedArtists: Record<string, string[]> = {
                    telugu: ['Sid Sriram', 'Thaman S', 'Devi Sri Prasad', 'Mani Sharma', 'S. P. Balasubrahmanyam', 'Karthik', 'Anurag Kulkarni', 'Ram Miriyala', 'Mangli', 'Armaan Malik', 'Geetha Madhuri', 'S. Janaki'],
                    hindi: ['Arijit Singh', 'Shreya Ghoshal', 'Badshah', 'Pritam', 'Anirudh Ravichander', 'Jubin Nautiyal', 'Neha Kakkar', 'Atif Aslam', 'Sunidhi Chauhan', 'Vishal Dadlani', 'Amit Trivedi', 'Mohit Chauhan'],
                    punjabi: ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'Guru Randhawa', 'Hardy Sandhu', 'Ammy Virk', 'Jasmine Sandlas', 'Nimrat Khaira', 'Sharry Maan', 'Satinder Sartaaj', 'B Praak'],
                    tamil: ['Anirudh Ravichander', 'A. R. Rahman', 'Yuvan Shankar Raja', 'Santhosh Narayanan', 'G. V. Prakash', 'Harris Jayaraj', 'D. Imman', 'Vijay Antony', 'Hiphop Tamizha', 'Shweta Mohan', 'Sujatha', 'Haricharan'],
                    english: ['Taylor Swift', 'The Weeknd', 'Drake', 'Ed Sheeran', 'Justin Bieber', 'Dua Lipa', 'Bruno Mars', 'Ariana Grande', 'Billie Eilish', 'Post Malone', 'Kendrick Lamar', 'Rihanna', 'Eminem', 'Sia']
                };

                const artistsToFetch = curatedArtists[language.toLowerCase()] || [language];

                const getSanitizedUrl = (baseUrl: string) => {
                    return baseUrl.includes('limit=')
                        ? baseUrl.split('limit=')[0].slice(0, -1)
                        : baseUrl;
                };

                const sanitizedPlaylistSearch = getSanitizedUrl(playlistSearch);
                const sanitizedSearchArtist = getSanitizedUrl(searchArtist);

                const results = await Promise.allSettled([
                    axios.get(`${modules}${language}&page=0&limit=25`),
                    axios.get(`${songsUrl}?query=${encodeURIComponent(language + ' Top Hits')}&page=0&limit=100`),
                    axios.get(`${playlistSearch}${language}`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Meditation')}&limit=15`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Work')}&limit=15`),
                    axios.get(`${playlistById}158224644`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Chill')}&limit=15`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Workout')}&limit=15`),
                    axios.get(`${songsUrl}?query=${encodeURIComponent(language + ' New Songs')}&page=0&limit=100`),
                    ...artistsToFetch.map(name => {
                        return axios.get(`${sanitizedSearchArtist}${sanitizedSearchArtist.includes('?') ? '&' : '?'}query=${encodeURIComponent(name)}&limit=1`);
                    })
                ]);

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
                        const title = (song.name || song.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (seen.has(title)) return false;
                        seen.add(title);
                        return true;
                    });
                };

                const rawTrendingSongs = songsRes.status === 'fulfilled' ? (songsRes.value.data.data.results || []) : [];
                const rawLatestSongs = latestSongsRes.status === 'fulfilled' ? (latestSongsRes.value.data.data.results || []) : [];

                const latestSongs = deduplicateSongs(rawLatestSongs).slice(0, 20);
                const trendingSongs = deduplicateSongs(rawTrendingSongs)
                    .filter(ts => !latestSongs.some(ls =>
                        (ls.name || ls.title || '').toLowerCase().replace(/[^a-z0-9]/g, '') ===
                        (ts.name || ts.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    ))
                    .slice(0, 20);

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
            } catch (error) {
                console.error('Error in fetchData:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [language]);

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

    const carouselItems = [...data.albums.slice(0, 3), ...data.playlists.slice(0, 2)];

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-32 pt-4 sm:pt-8 will-change-transform contain-layout gpu-accelerated"
        >
            <HeroCarousel items={carouselItems} />

            <DailyMix />

            {recentlyPlayed && recentlyPlayed.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={recentlyPlayed} title="Recently Played Songs" />
                </motion.div>
            )}
            {recentlyPlayedAlbums && recentlyPlayedAlbums.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={recentlyPlayedAlbums} title="Recently Played Albums" />
                </motion.div>
            )}
            {data.latestSongs && data.latestSongs.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.latestSongs} title="Latest Songs" />
                </motion.div>
            )}

            {data.songs && data.songs.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.songs} title="Trending Songs" />
                </motion.div>
            )}
            {data.albums && data.albums.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.albums} title="Trending Albums" />
                </motion.div>
            )}
            {data.artists && data.artists.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.artists} title="Featured Artists" />
                </motion.div>
            )}
            {data.playlists && data.playlists.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.playlists} title="Top Playlists" />
                </motion.div>
            )}

            {data.meditation && data.meditation.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.meditation} title="Meditation" />
                </motion.div>
            )}

            {data.work && data.work.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.work} title="Work" />
                </motion.div>
            )}

            {data.devPicks && data.devPicks.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.devPicks} title="Developer's Picks" />
                </motion.div>
            )}

            {data.chill && data.chill.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.chill} title="Chill" />
                </motion.div>
            )}

            {data.workout && data.workout.length > 0 && (
                <motion.div variants={itemVariants} className="mb-8 sm:mb-12 px-2 sm:px-0">
                    <Slider data={data.workout} title="Workout" />
                </motion.div>
            )}

        </motion.div>
    );
};

export default MainSection;
