import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import { suggestions } from '../constants';
import { motion } from 'framer-motion';

const DailyMix: React.FC = () => {
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);
    const [mixedSongs, setMixedSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
    const COOLDOWN = 30 * 60 * 1000; // 30 minutes cooldown

    useEffect(() => {
        const fetchMix = async () => {
            if (!recentlyPlayed || recentlyPlayed.length === 0) return;

            const now = Date.now();
            // Only update if cooldown has passed or if we have no songs yet
            if (mixedSongs.length > 0 && now - lastUpdateTime < COOLDOWN) {
                return;
            }

            setLoading(true);
            try {
                // Get a few recent songs to base suggestions on
                const baseSongs = recentlyPlayed.slice(0, 3);
                const suggestPromises = baseSongs.map(song => axios.get(suggestions(song.id)));
                const results = await Promise.allSettled(suggestPromises);

                let allSuggestions: any[] = [];
                results.forEach(res => {
                    if (res.status === 'fulfilled') {
                        allSuggestions = [...allSuggestions, ...(res.value.data.data || [])];
                    }
                });

                // Remove duplicates and shuffle (Fisher-Yates)
                const uniqueSuggestions = Array.from(new Map(allSuggestions.map(s => [s.id, s])).values());
                for (let i = uniqueSuggestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [uniqueSuggestions[i], uniqueSuggestions[j]] = [uniqueSuggestions[j], uniqueSuggestions[i]];
                }
                const shuffled = uniqueSuggestions.slice(0, 20);

                setMixedSongs(shuffled);
                setLastUpdateTime(now);
            } catch (error) {
                console.error('Error fetching Daily Mix:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMix();
    }, [recentlyPlayed]);

    if (loading || mixedSongs.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <Slider data={mixedSongs} title="Made For You: Daily Mix" />
        </motion.div>
    );
};

export default DailyMix;
