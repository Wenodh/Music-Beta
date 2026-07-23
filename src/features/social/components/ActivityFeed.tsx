import React from 'react';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { ActivityItem } from '../types';
import { motion } from 'framer-motion';

const ActivityFeed: React.FC = () => {
    const { feed, loading, hasMore, loadMore } = useActivityFeed();

    const renderActivityCard = (item: ActivityItem) => {
        switch (item.type) {
            case 'playlist_shared':
                return (
                    <div className="bg-card p-4 rounded-2xl border border-secondary/10 mb-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src={item.actor?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.actor?.username}`}
                                className="w-10 h-10 rounded-full"
                                alt=""
                            />
                            <div>
                                <p className="text-sm">
                                    <span className="font-bold">{item.actor?.displayName}</span> shared a playlist
                                </p>
                                <p className="text-[10px] text-secondary">{new Date(item.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="bg-secondary/5 rounded-xl p-3 flex gap-4 items-center">
                            <div className="w-16 h-16 bg-accent/20 rounded-lg flex-shrink-0" />
                            <div>
                                <h3 className="font-bold text-sm">{item.payload.name}</h3>
                                <p className="text-xs text-secondary">{item.payload.trackCount} tracks</p>
                            </div>
                        </div>
                    </div>
                );
            case 'follow':
                return (
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="relative">
                            <img
                                src={item.actor?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.actor?.username}`}
                                className="w-8 h-8 rounded-full"
                                alt=""
                            />
                            <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5">
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
                            </div>
                        </div>
                        <p className="text-sm">
                            <span className="font-bold">{item.actor?.displayName}</span> started following <span className="font-bold">{item.payload.followingName}</span>
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderSkeletons = () => (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/5 animate-pulse rounded-2xl p-4 h-32" />
            ))}
        </div>
    );

    return (
        <div className="max-w-xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Activity</h1>

            {loading && feed.length === 0 ? (
                renderSkeletons()
            ) : feed.length > 0 ? (
                <div className="space-y-2">
                    {feed.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.05, 0.5) }}
                        >
                            {renderActivityCard(item)}
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold">No activity yet</h3>
                    <p className="text-sm text-secondary mt-1">Follow some friends to see what they're listening to!</p>
                </div>
            )}

            {loading && feed.length > 0 && (
                <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {hasMore && !loading && (
                <button
                    onClick={loadMore}
                    className="w-full py-4 text-primary text-sm font-bold uppercase tracking-wider hover:bg-primary/5 rounded-xl transition-colors mt-4"
                >
                    Load More
                </button>
            )}
        </div>
    );
};

export default ActivityFeed;
