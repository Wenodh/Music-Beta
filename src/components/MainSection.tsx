import { logger } from "../lib/logger";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import { motion } from 'framer-motion';
import { IoCloudOffline, IoArrowForward } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { musicApi } from '../services/musicApi';
import { Album, Song, Artist, Playlist } from '../types/music';
import { MediaItem } from '../lib/audio-sdk/models';
import { mediaItemToSong } from '../lib/adapters/mediaItemAdapter';
import { audioSDK } from '../lib/audio-sdk';
import { DailyMixModule, DiscoveryModule } from '../lib/recommendations/modules';
import { Recommendation } from '../lib/recommendations/types';

interface MainSectionData {
    albums: Album[];
    songs: Song[];
    playlists: Playlist[];
    artists: Artist[];
    meditation: Playlist[];
    work: Playlist[];
    devPicks: Song[];
    chill: Playlist[];
    workout: Playlist[];
    latestSongs: Song[];
    popularBooks: MediaItem[];
    recentBooks: MediaItem[];
}

const MainSection: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed, recentlyPlayedAlbums, history } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<MainSectionData>({
        albums: [],
        songs: [],
        playlists: [],
        artists: [],
        meditation: [],
        work: [],
        devPicks: [],
        chill: [],
        workout: [],
        latestSongs: [],
        popularBooks: [],
        recentBooks: []
    });
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [podcasts, setPodcasts] = useState<MediaItem[]>([]);
    const [recommendations, setRecommendations] = useState<Record<string, Recommendation[]>>({});

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

    const fetchData = useCallback(async () => {
        if (isOffline) return;
        try {
            setLoading(true);
            const lang = language.toLowerCase();

            const curatedArtists: Record<string, string[]> = {
                telugu: ['Sid Sriram', 'Thaman S', 'Devi Sri Prasad', 'Mani Sharma', 'S. P. Balasubrahmanyam', 'Karthik', 'Anurag Kulkarni', 'Ram Miriyala', 'Mangli', 'Armaan Malik', 'Geetha Madhuri', 'S. Janaki'],
                hindi: ['Arijit Singh', 'Shreya Ghoshal', 'Badshah', 'Pritam', 'Anirudh Ravichander', 'Jubin Nautiyal', 'Neha Kakkar', 'Atif Aslam', 'Sunidhi Chauhan', 'Vishal Dadlani', 'Amit Trivedi', 'Mohit Chauhan'],
                punjabi: ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'Guru Randhawa', 'Hardy Sandhu', 'Ammy Virk', 'Jasmine Sandlas', 'Nimrat Khaira', 'Sharry Maan', 'Satinder Sartaaj', 'B Praak'],
                tamil: ['Anirudh Ravichander', 'A. R. Rahman', 'Yuvan Shankar Raja', 'Santhosh Narayanan', 'G. V. Prakash', 'Harris Jayaraj', 'D. Imman', 'Vijay Antony', 'Hiphop Tamizha', 'Shweta Mohan', 'Sujatha', 'Haricharan'],
                english: ['Taylor Swift', 'The Weeknd', 'Drake', 'Ed Sheeran', 'Justin Bieber', 'Dua Lipa', 'Bruno Mars', 'Ariana Grande', 'Billie Eilish', 'Post Malone', 'Kendrick Lamar', 'Rihanna', 'Eminem', 'Sia']
            };

            const artistsToFetch = curatedArtists[lang] || [language];

            const results = await Promise.allSettled([
                musicApi.getTrending(lang, 0, 25),
                musicApi.searchSongs(`${lang} Top Hits`, 0, 40),
                musicApi.searchPlaylists(lang, 0, 25),
                musicApi.searchPlaylists(`${lang} Meditation`, 0, 15),
                musicApi.searchPlaylists(`${lang} Work`, 0, 15),
                musicApi.getPlaylistById("158224644"), // Dev picks
                musicApi.searchPlaylists(`${lang} Chill`, 0, 15),
                musicApi.searchPlaylists(`${lang} Workout`, 0, 15),
                musicApi.searchSongs(`${lang} New Songs`, 0, 40),
                audioSDK.getPopularAudiobooks(20),
                audioSDK.getRecentAudiobooks(20),
                audioSDK.getTrendingPodcasts(15),
                ...artistsToFetch.map(name => musicApi.searchArtists(name, 0, 1))
            ]);

            const getValue = <T,>(result: PromiseSettledResult<T>, defaultValue: T): T => {
                if (result.status !== 'fulfilled') return defaultValue;
                const val = result.value as any;
                // Defensive check: handle if the result is an axios response (contains .data.data)
                // or if it's already unwrapped (common in our musicApi and audioSDK)
                if (val && typeof val === 'object' && val.data && val.data.data) {
                    return val.data.data;
                }
                return val ?? defaultValue;
            };

            const artistList = results.slice(12) // audioSDK results are 9, 10, 11. Artists start at 12.
                .filter((r): r is PromiseFulfilledResult<Artist[]> => r.status === 'fulfilled')
                .map(r => r.value?.[0])
                .filter(Boolean);

            const devPicksResult = results[5];
            const devPicksSongs = devPicksResult.status === 'fulfilled' ? (devPicksResult.value as any).songs || (devPicksResult.value as any).data?.data?.songs || [] : [];

            setData({
                albums: getValue(results[0], []),
                songs: getValue(results[1], []),
                playlists: getValue(results[2], []),
                artists: artistList,
                meditation: getValue(results[3], []),
                work: getValue(results[4], []),
                devPicks: devPicksSongs,
                chill: getValue(results[6], []),
                workout: getValue(results[7], []),
                latestSongs: getValue(results[8], []),
                popularBooks: getValue(results[9], []),
                recentBooks: getValue(results[10], [])
            });
            setPodcasts(getValue(results[11], []));

            // Load Recommendations
            const modules = [new DailyMixModule(), new DiscoveryModule()];
            const recResults = await Promise.all(modules.map(m => m.load()));
            const recMap: Record<string, Recommendation[]> = {};
            modules.forEach((m, i) => {
                if (recResults[i].length > 0) recMap[m.id] = recResults[i];
            });
            setRecommendations(recMap);

        } catch (error) {
            logger.error('Error in fetchData:', error);
        } finally {
            setLoading(false);
        }
    }, [language, isOffline]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
    };

    const continueListening = useMemo(() => {
        return (history || [])
            .filter(h => h.completionPercentage < 95 && h.listenedDuration > 5 && h.media.type !== 'radio')
            .map(h => ({
                ...mediaItemToSong(h.media),
                _history: h
            })) || [];
    }, [history]);

    const recentlyPlayedUnified = useMemo(() => {
        if (history && history.length > 0) {
            return history.map(h => mediaItemToSong(h.media));
        }
        return recentlyPlayed;
    }, [history, recentlyPlayed]);

    const sections = [
        {
            data: continueListening,
            title: "Continue Listening"
        },
        {
            data: recommendations['daily-mix']?.map(r => mediaItemToSong(r.media)),
            title: "Your Daily Mix",
            subtitle: "Personalized for you"
        },
        {
            data: recentlyPlayedUnified,
            title: "Recently Played"
        },
        {
            data: recommendations['discovery']?.map(r => mediaItemToSong(r.media)),
            title: "Discover Something New"
        },
        { data: recentlyPlayedAlbums, title: "Recently Played Albums" },
        { data: podcasts, title: "Trending Podcasts" },
        { data: data.popularBooks, title: "Popular Audiobooks" },
        { data: data.recentBooks, title: "Recently Added Audiobooks" },
        { data: data.latestSongs, title: "Latest Songs" },
        { data: data.songs, title: "Trending Songs" },
        { data: data.albums, title: "Trending Albums" },
        { data: data.artists, title: "Featured Artists" },
        { data: data.playlists, title: "Top Playlists" },
        { data: data.meditation, title: "Meditation" },
        { data: data.work, title: "Work" },
        { data: data.devPicks, title: "Developer's Picks" },
        { data: data.chill, title: "Chill" },
        { data: data.workout, title: "Workout" }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (isOffline) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-400">
                    <IoCloudOffline size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-2">You're Offline</h2>
                <button
                    onClick={() => navigate('/library?tab=offline')}
                    className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-bold mt-4"
                >
                    Go to Downloads <IoArrowForward />
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

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-32 pt-4 px-2 sm:px-4"
        >
            <DailyMix />

            {sections.map((section, idx) => (
                section.data && Array.isArray(section.data) && section.data.length > 0 && (
                    <motion.div key={idx} variants={itemVariants} className="mb-8 sm:mb-12">
                        <Slider data={section.data} title={section.title} />
                    </motion.div>
                )
            ))}
        </motion.div>
    );
};

export default MainSection;
