import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import Slider from './Slider';
import { suggestions } from '../constants';
import { motion } from 'framer-motion';
import { setDailyMix } from '../features/musicplayer/musicPlayerSlice';
import { musicApiService } from '../services/musicApiService';

const DailyMix: React.FC = () => {
    const dispatch = useAppDispatch();
    const { recentlyPlayed, dailyMix, lastDailyMixUpdate } = useAppSelector((state) => state.musicPlayer);
    const [loading, setLoading] = useState(false);
    const COOLDOWN = 30 * 60 * 1000; // 30 minutes cooldown

    useEffect(() => {
        if (!recentlyPlayed?.length) return;
        if (dailyMix?.length && Date.now() - lastDailyMixUpdate < COOLDOWN) return;

        const controller = new AbortController();
        let mounted = true;

        const fetchMix = async () => {
            setLoading(true);
            try {
                // Seed from the three most recent tracks; the API service deduplicates
                // identical requests and caches each seed's recommendation response.
                const baseSongs = recentlyPlayed.slice(0, 3);
                const results = await Promise.allSettled(baseSongs.map((song) => {
                    const fullUrl = suggestions(song.id);
                    const path = fullUrl.replace(/https?:\/\/[^/]+/, '');
                    return musicApiService.fetchWithFallback(path, {
                        timeout: 6000,
                        signal: controller.signal,
                    });
                }));

                if (controller.signal.aborted) return;

                const byId = new Map<string, any>();
                results.forEach((result) => {
                    if (result.status !== 'fulfilled') return;
                    const payload = result.value.data;
                    const tracks = payload?.data || payload?.results || [];
                    if (Array.isArray(tracks)) {
                        tracks.forEach((track: any) => {
                            if (track?.id && !byId.has(track.id)) byId.set(track.id, track);
                        });
                    }
                });

                const uniqueSuggestions = [...byId.values()];
                for (let i = uniqueSuggestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [uniqueSuggestions[i], uniqueSuggestions[j]] = [uniqueSuggestions[j], uniqueSuggestions[i]];
                }

                if (mounted && uniqueSuggestions.length) {
                    dispatch(setDailyMix({ songs: uniqueSuggestions.slice(0, 20), timestamp: Date.now() }));
                }
            } catch (error: any) {
                if (error?.name !== 'CanceledError' && !controller.signal.aborted) {
                    console.error('Error fetching Daily Mix:', error);
                }
            } finally {
                if (mounted && !controller.signal.aborted) setLoading(false);
            }
        };

        void fetchMix();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, [recentlyPlayed, dailyMix, lastDailyMixUpdate, dispatch]);

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading || !dailyMix || dailyMix.length === 0) return null;

    return (
        <motion.div
            variants={itemVariants}
            className="mb-8 sm:mb-12"
        >
            <Slider data={dailyMix} title="Made For You: Daily Mix" />
        </motion.div>
    );
};

export default DailyMix;
