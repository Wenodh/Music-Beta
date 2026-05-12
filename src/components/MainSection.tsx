import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import CommunityFeed from './CommunityFeed';
import { motion } from 'framer-motion';
import { modules, songs as songsUrl, playlistSearch, searchArtist } from '../constants';
import { AlbumSearchResult, ArtistSearchResult, PlaylistSearchResult } from '../types/api';
import { Song } from '../types/music';

const MainSection: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed, recentlyPlayedAlbums } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<{
        albums: AlbumSearchResult[];
        songs: Song[];
        playlists: PlaylistSearchResult[];
        artists: ArtistSearchResult[];
        moodPlaylists: PlaylistSearchResult[];
    }>({
        albums: [],
        songs: [],
        playlists: [],
        artists: [],
        moodPlaylists: []
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

                const moods = ['Chill', 'Workout', 'Party', 'Romance', 'Focus'];
                const selectedMood = moods[Math.floor(Math.random() * moods.length)];

                const results = await Promise.allSettled([
                    axios.get(`${modules}${language}&page=0&limit=25`),
                    axios.get(`${songsUrl}?query=${language}&page=0&limit=25`),
                    axios.get(`${playlistSearch}${language}`),
                    axios.get(`${playlistSearch}${selectedMood}`),
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
                const moodRes = results[3];
                const artistsResults = results.slice(4);

                const artistList = artistsResults
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value.data.data.results?.[0])
                    .filter(Boolean);

                setData({
                    albums: albumsRes.status === 'fulfilled' ? (albumsRes.value.data.data.results || []) : [],
                    songs: songsRes.status === 'fulfilled' ? (songsRes.value.data.data.results || []) : [],
                    playlists: playlistsRes.status === 'fulfilled' ? (playlistsRes.value.data.data.results || []) : [],
                    artists: artistList,
                    moodPlaylists: moodRes.status === 'fulfilled' ? (moodRes.value.data.data.results || []) : []
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
                    <Slider data={recentlyPlayed} title="Recently Played Songs" />
                </motion.div>
            )}
            {recentlyPlayedAlbums && recentlyPlayedAlbums.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={recentlyPlayedAlbums} title="Recently Played Albums" />
                </motion.div>
            )}
            {data.songs && data.songs.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.songs} title="Trending Songs" />
                </motion.div>
            )}
            {data.albums && data.albums.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.albums} title="Trending Albums" />
                </motion.div>
            )}
            {data.artists && data.artists.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.artists} title="Featured Artists" />
                </motion.div>
            )}
            {data.moodPlaylists && data.moodPlaylists.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.moodPlaylists} title="Discover by Mood" />
                </motion.div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {data.playlists && data.playlists.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <Slider data={data.playlists} title="Top Playlists" />
                        </motion.div>
                    )}
                </div>
                <div className="lg:col-span-1">
                    <motion.div variants={itemVariants} className="sticky top-24">
                        <CommunityFeed />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default MainSection;
