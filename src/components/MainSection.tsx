import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import { motion } from 'framer-motion';

const MainSection: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get(
                    `https://saavn.dev/api/modules?language=${language}`
                );
                setData(response.data.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [language]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
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
            className="pb-32 pt-4"
        >
            {recentlyPlayed && recentlyPlayed.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Slider data={recentlyPlayed} title="Recently Played" />
                </motion.div>
            )}
            {data?.albums && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.albums} title="Trending Albums" />
                </motion.div>
            )}
            {data?.playlists && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.playlists} title="Top Playlists" />
                </motion.div>
            )}
            {data?.charts && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.charts} title="Charts" />
                </motion.div>
            )}
            {data?.trending?.albums && (
                <motion.div variants={itemVariants}>
                    <Slider data={data.trending.albums} title="Trending Now" />
                </motion.div>
            )}
        </motion.div>
    );
};

export default MainSection;
