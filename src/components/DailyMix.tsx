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
                    }, undefined, { staleWhileRevalidate: true });
                }));

                if (controller.signal.aborted) return;

                const buildMix = (responses: any[]) => {
                    const byId = new Map<string, any>();
                    responses.forEach(response => {
                        if (!response) return;
                        const payload = response.data;
                        const tracks = payload?.data?.results || payload?.data?.songs ||
                            payload?.results || payload?.songs || (Array.isArray(payload?.data) ? payload.data : []);
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
                    return uniqueSuggestions.slice(0, 20);
                };

                const currentResponses = results.map(result => result.status === 'fulfilled' ? result.value : null);
                const initialMix = buildMix(currentResponses);
                if (mounted && initialMix.length) {
                    dispatch(setDailyMix({ songs: initialMix, timestamp: Date.now() }));
                }

                const refreshes = results.map((result, index) => {
                    if (result.status !== 'fulfilled' || !result.value.refreshPromise) return null;
                    return result.value.refreshPromise.then(freshResponse => {
                        currentResponses[index] = freshResponse;
                    });
                }).filter(Boolean) as Promise<void>[];

                if (refreshes.length) {
                    void Promise.allSettled(refreshes).then(() => {
                        if (!mounted || controller.signal.aborted) return;
                        const refreshedMix = buildMix(currentResponses);
                        if (refreshedMix.length) {
                            dispatch(setDailyMix({ songs: refreshedMix, timestamp: Date.now() }));
                        }
                    });
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
