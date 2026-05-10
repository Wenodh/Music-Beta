import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import { motion } from 'framer-motion';
import { modules, songs as songsUrl, playlistSearch, searchArtist } from '../constants';

const MainSection: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed, recentlyPlayedAlbums } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<{
        albums: any[];
        songs: any[];
        playlists: any[];
        artists: any[];
    }>({
        albums: [],
        songs: [],
        playlists: [],
        artists: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // For artists, searching just by language gives poor results.
                // We use a curated list of top artists per language to get better "Featured Artists"
                const artistQueries: Record<string, string> = {
                    telugu: 'Sid Sriram, Thaman S, Devi Sri Prasad, Mani Sharma, M. M. Keeravani, S. P. Balasubrahmanyam',
                    hindi: 'Arijit Singh, Shreya Ghoshal, Badshah, Pritam, Neha Kakkar, Sonu Nigam, Atif Aslam',
                    punjabi: 'Sidhu Moose Wala, Diljit Dosanjh, Karan Aujla, AP Dhillon, Guru Randhawa',
                    tamil: 'Anirudh Ravichander, A. R. Rahman, Yuvan Shankar Raja, Santhosh Narayanan, G. V. Prakash',
                    english: 'Taylor Swift, The Weeknd, Drake, Ed Sheeran, Justin Bieber, Bruno Mars, Dua Lipa'
                };

                const artistQuery = artistQueries[language.toLowerCase()] || language;

                const results = await Promise.allSettled([
                    axios.get(`${modules}${language}&page=0&limit=25`),
                    axios.get(`${songsUrl}?query=${language}&page=0&limit=25`),
                    axios.get(`${playlistSearch}${language}`),
                    axios.get(`${searchArtist}${artistQuery}&limit=15`)
                ]);

                const [albumsRes, songsRes, playlistsRes, artistsRes] = results;

                setData({
                    albums: albumsRes.status === 'fulfilled' ? (albumsRes.value.data.data.results || []) : [],
                    songs: songsRes.status === 'fulfilled' ? (songsRes.value.data.data.results || []) : [],
                    playlists: playlistsRes.status === 'fulfilled' ? (playlistsRes.value.data.data.results || []) : [],
                    artists: artistsRes.status === 'fulfilled' ? (artistsRes.value.data.data.results || []) : []
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
            className="pb-32 pt-8"
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
            {data.playlists && data.playlists.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.playlists} title="Top Playlists" />
                </motion.div>
            )}
            {data.artists && data.artists.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.artists} title="Featured Artists" />
                </motion.div>
            )}
        </motion.div>
    );
};

export default MainSection;
