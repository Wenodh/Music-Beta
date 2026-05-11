import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import CommunityFeed from './CommunityFeed';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlbumSkeleton } from './Skeleton';
import { modules, songs as songsUrl, playlistSearch, searchArtist } from '../constants';

const MainSection: React.FC = () => {
    const { t } = useTranslation();
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed, recentlyPlayedAlbums } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<{
        albums: any[];
        songs: any[];
        playlists: any[];
        artists: any[];
        moods: any[];
    }>({
        albums: [],
        songs: [],
        playlists: [],
        artists: [],
        moods: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Curated artists per language
                const curatedArtists: Record<string, string[]> = {
                    telugu: ['Sid Sriram', 'Thaman S', 'Devi Sri Prasad', 'Mani Sharma', 'S. P. Balasubrahmanyam'],
                    hindi: ['Arijit Singh', 'Shreya Ghoshal', 'Badshah', 'Pritam', 'Anirudh Ravichander'],
                    punjabi: ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'Guru Randhawa'],
                    tamil: ['Anirudh Ravichander', 'A. R. Rahman', 'Yuvan Shankar Raja', 'Santhosh Narayanan', 'G. V. Prakash'],
                    english: ['Taylor Swift', 'The Weeknd', 'Drake', 'Ed Sheeran', 'Justin Bieber', 'Dua Lipa']
                };

                const artistsToFetch = curatedArtists[language.toLowerCase()] || [language];

                const moodQueries = ['Chill', 'Workout', 'Party', 'Focus', 'Sad', 'Romantic'];

                const results = await Promise.allSettled([
                    axios.get(`${modules}${language}&page=0&limit=25`),
                    axios.get(`${songsUrl}?query=${language}&page=0&limit=25`),
                    axios.get(`${playlistSearch}${language}`),
                    ...moodQueries.map(mood => {
                        const baseUrl = playlistSearch.includes('limit=')
                            ? playlistSearch.split('limit=')[0].slice(0, -1)
                            : playlistSearch;
                        return axios.get(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}query=${encodeURIComponent(mood)}&limit=1`);
                    }),
                    ...artistsToFetch.map(name => {
                        // Remove limit from searchArtist if it already contains it
                        const baseUrl = searchArtist.includes('limit=')
                            ? searchArtist.split('limit=')[0].slice(0, -1)
                            : searchArtist;
                        return axios.get(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}query=${encodeURIComponent(name)}&limit=1`);
                    })
                ]);

                const albumsRes = results[0];
                const songsRes = results[1];
                const playlistsRes = results[2];
                const moodResults = results.slice(3, 3 + moodQueries.length);
                const artistsResults = results.slice(3 + moodQueries.length);

                const moodList = moodResults
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value.data.data.results?.[0])
                    .filter(Boolean);

                const artistList = artistsResults
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value.data.data.results?.[0])
                    .filter(Boolean);

                setData({
                    albums: albumsRes.status === 'fulfilled' ? (albumsRes.value.data.data.results || []) : [],
                    songs: songsRes.status === 'fulfilled' ? (songsRes.value.data.data.results || []) : [],
                    playlists: playlistsRes.status === 'fulfilled' ? (playlistsRes.value.data.data.results || []) : [],
                    artists: artistList,
                    moods: moodList
                });
            } catch (error) {
                console.error('Error in fetchData:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [language]);

    if (loading) {
        return (
            <div className="pb-32 pt-8 px-4 space-y-12">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-4">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="flex gap-4 overflow-hidden">
                            {[1, 2, 3, 4, 5, 6].map((j) => (
                                <AlbumSkeleton key={j} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-32 pt-8 px-4"
        >
            <motion.div variants={itemVariants}>
                <DailyMix />
            </motion.div>

            {recentlyPlayed && recentlyPlayed.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={recentlyPlayed} title={`${t('common.recently_played')} ${t('player.queue')}`} />
                </motion.div>
            )}
            {recentlyPlayedAlbums && recentlyPlayedAlbums.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={recentlyPlayedAlbums} title={`${t('common.recently_played')} Albums`} />
                </motion.div>
            )}
            {data.songs && data.songs.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.songs} title={`${t('common.trending')} Songs`} />
                </motion.div>
            )}
            {data.albums && data.albums.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.albums} title={`${t('common.trending')} Albums`} />
                </motion.div>
            )}
            {data.artists && data.artists.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.artists} title={t('common.featured_artists')} />
                </motion.div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {data.playlists && data.playlists.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <Slider data={data.playlists} title={t('common.top_playlists')} />
                        </motion.div>
                    )}
                </div>
                <div className="lg:col-span-1">
                    <motion.div variants={itemVariants} className="sticky top-24">
                        <CommunityFeed />
                    </motion.div>
                </div>
            </div>

            {data.moods && data.moods.length > 0 && (
                <motion.div variants={itemVariants} className="mt-8">
                    <Slider data={data.moods} title={t('common.moods')} />
                </motion.div>
            )}
        </motion.div>
    );
};

export default MainSection;
