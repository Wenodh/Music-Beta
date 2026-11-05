import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArcadeGameId, ArcadeLeaderboardItem } from '../types';
import { ArcadeLeaderboardService } from '../services/arcadeLeaderboardService';
import { getGameScoreRecord } from '../services/arcadeStorage';
import { useAppSelector } from '../../../hooks/redux';
import {
    IoClose,
    IoTrophy,
    IoTimeOutline,
    IoPeopleOutline,
    IoPersonOutline,
    IoSparkles,
} from 'react-icons/io5';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: ArcadeGameId;
    gameTitle: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
    isOpen,
    onClose,
    gameId,
    gameTitle,
}) => {
    const [activeTab, setActiveTab] = useState<'global' | 'friends' | 'my-best'>('global');
    const [timeFilter, setTimeFilter] = useState<'all' | 'weekly' | 'daily'>('all');
    const [items, setItems] = useState<ArcadeLeaderboardItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [myBestRecord, setMyBestRecord] = useState<any>(null);

    const { friends } = useAppSelector((state) => state.friends);
    const friendUserIds = friends ? Object.keys(friends) : [];

    useEffect(() => {
        if (!isOpen) return;

        // Fetch local best record
        getGameScoreRecord(gameId).then(setMyBestRecord);

        // Fetch leaderboard from service
        setLoading(true);
        ArcadeLeaderboardService.fetchLeaderboard({
            gameId,
            timeFilter,
            friendUserIds: activeTab === 'friends' ? friendUserIds : undefined,
            limit: 50,
        })
            .then(({ items }) => setItems(items))
            .finally(() => setLoading(false));
    }, [isOpen, gameId, activeTab, timeFilter]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg bg-gray-900 border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] text-white overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                                <IoTrophy size={20} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black tracking-tight">{gameTitle}</h3>
                                <p className="text-[11px] text-gray-400">Universal Leaderboard</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-all cursor-pointer"
                            aria-label="Close"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>

                    {/* Nav Tabs */}
                    <div className="flex items-center justify-between gap-1 py-3 border-b border-white/10 text-xs font-bold">
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('global')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeTab === 'global' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <IoTrophy size={14} /> Global Top 50
                            </button>
                            <button
                                onClick={() => setActiveTab('friends')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeTab === 'friends' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <IoPeopleOutline size={14} /> Friends
                            </button>
                            <button
                                onClick={() => setActiveTab('my-best')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeTab === 'my-best' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <IoPersonOutline size={14} /> My Best
                            </button>
                        </div>

                        {activeTab !== 'my-best' && (
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl text-[10px]">
                                <button
                                    onClick={() => setTimeFilter('all')}
                                    className={`px-2 py-1 rounded-lg ${
                                        timeFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'text-gray-400'
                                    }`}
                                >
                                    All-Time
                                </button>
                                <button
                                    onClick={() => setTimeFilter('weekly')}
                                    className={`px-2 py-1 rounded-lg ${
                                        timeFilter === 'weekly' ? 'bg-white/20 text-white font-bold' : 'text-gray-400'
                                    }`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => setTimeFilter('daily')}
                                    className={`px-2 py-1 rounded-lg ${
                                        timeFilter === 'daily' ? 'bg-white/20 text-white font-bold' : 'text-gray-400'
                                    }`}
                                >
                                    Today
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                        {activeTab === 'my-best' ? (
                            <div className="space-y-3 py-2">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-center">
                                    <span className="text-3xl">🏅</span>
                                    <h4 className="text-sm font-bold text-gray-200">Personal Best Record</h4>
                                    <p className="text-2xl font-black text-amber-400 font-mono">
                                        {myBestRecord?.bestDisplayValue || 'No scores logged yet'}
                                    </p>
                                    {myBestRecord?.playedAt && (
                                        <p className="text-[10px] text-gray-500">
                                            Last played: {new Date(myBestRecord.playedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 text-center px-4">
                                    Scores are safely saved locally on device and automatically synchronized to the cloud when signed in.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">Loading rankings...</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-1">
                                <p className="text-sm font-semibold">No entries found yet.</p>
                                <p className="text-xs text-gray-500">Be the first to set a high score in this category!</p>
                            </div>
                        ) : (
                            items.map((item, idx) => {
                                const rank = item.rank || idx + 1;
                                let medal = null;
                                if (rank === 1) medal = '🥇';
                                else if (rank === 2) medal = '🥈';
                                else if (rank === 3) medal = '🥉';

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                            item.isCurrentUser
                                                ? 'bg-primary/20 border-primary/40'
                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 text-center font-bold text-sm">
                                                {medal || `#${rank}`}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                                    {item.username}
                                                    {item.isCurrentUser && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-white font-black uppercase">
                                                            You
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-sm font-black font-mono text-amber-400">
                                            {item.displayValue}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
