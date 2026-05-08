import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Song } from '../types/music';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { motion } from 'framer-motion';
import { IoMusicalNotesOutline, IoPeopleOutline } from 'react-icons/io5';
import { decodeHtmlEntities } from '../utils/decodeHtml';

const CommunityActivity: React.FC = () => {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                // Fetch recent favorites from all users as a proxy for "Global Activity"
                // In a real app, you'd have a 'listens' table
                const { data, error } = await supabase
                    .from('favorites')
                    .select('song_data, created_at')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;
                setActivities(data || []);
            } catch (err) {
                console.error('Error fetching community activity:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();

        // Subscribe to real-time updates
        const channel = supabase
            .channel('public:favorites')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites' }, (payload) => {
                setActivities(prev => [payload.new, ...prev].slice(0, 10));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading || activities.length === 0) return null;

    return (
        <section className="mt-12 px-4 md:px-0">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                    <IoPeopleOutline size={24} />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold">Community Activity</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">See what others are enjoying right now</p>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {activities.map((activity, index) => {
                    const song = activity.song_data as Song;
                    if (!song) return null;

                    return (
                        <motion.div
                            key={`${song.id}-${index}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => dispatch(playMusic(song))}
                            className="flex-shrink-0 w-64 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={Array.isArray(song.image) ? song.image[0]?.url : song.image}
                                        alt=""
                                        className="w-12 h-12 rounded-xl object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/0 group-hover:bg-red-500/20 transition-all rounded-xl">
                                        <IoMusicalNotesOutline className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{decodeHtmlEntities(song.name)}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{decodeHtmlEntities(song.primaryArtists)}</p>
                                    <p className="text-[9px] text-red-500 font-medium mt-1 uppercase tracking-wider">Recently Liked</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
};

export default CommunityActivity;
