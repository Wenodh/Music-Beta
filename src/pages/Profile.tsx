import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { motion } from 'framer-motion';
import { IoHeartOutline, IoLibraryOutline, IoTimeOutline, IoPersonCircleOutline, IoPeopleOutline, IoStatsChartOutline, IoFlameOutline, IoSparklesOutline } from 'react-icons/io5';
import { PageTemplate } from '../components/PageTemplate';
import { InsightsService, ListeningStats } from '../lib/recommendations/InsightsService';
import { setSessionModalOpen } from '../features/ui/uiSlice';

const Profile: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);
    const [insights, setInsights] = React.useState<ListeningStats | null>(null);

    useEffect(() => {
        InsightsService.getStats().then(setInsights);
    }, []);

    const stats = [
        { label: 'Favorites', value: favorites.length, icon: <IoHeartOutline className="text-red-500" /> },
        { label: 'Playlists', value: playlists.length, icon: <IoLibraryOutline className="text-blue-500" /> },
        { label: 'Recently Played', value: recentlyPlayed.length, icon: <IoTimeOutline className="text-green-500" /> },
    ];

    return (
        <PageTemplate title="Profile">
            <div className="space-y-12">
                {/* Header */}
                {isAuthenticated && user ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-gray-50 dark:bg-gray-800/40 rounded-3xl backdrop-blur-sm border border-white/10">
                        <img
                            src={user.user_metadata?.avatar_url || '/vibeon-logo.png'}
                            alt="Profile"
                            className="w-32 h-32 rounded-full border-4 border-primary shadow-2xl object-cover"
                        />
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                                {user.user_metadata?.full_name || 'Vibe On User'}
                            </h1>
                            <p className="text-gray-500 font-medium">{user.email}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl backdrop-blur-sm border border-white/10">
                        <IoPersonCircleOutline size={80} className="text-gray-300 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Guest Profile</h2>
                        <p className="text-gray-500">Sign in to sync your library across devices.</p>
                    </div>
                )}

                {/* Group Session Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-transparent border border-primary/20 rounded-3xl relative overflow-hidden group cursor-pointer"
                    onClick={() => dispatch(setSessionModalOpen(true))}
                >
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
                                <IoPeopleOutline className="text-primary" /> Group Session
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                Listen together with your friends in real-time. Start a session or join one using a room code.
                            </p>
                        </div>
                        <button
                            className="bg-primary text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:bg-red-600 transition-all active:scale-95"
                        >
                            Open Group
                        </button>
                    </div>
                    {/* Background Icon Decor */}
                    <IoPeopleOutline className="absolute -right-8 -bottom-8 text-9xl text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </motion.div>

                {/* Listening Insights */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black flex items-center gap-2 px-2">
                        <IoStatsChartOutline className="text-primary" /> Listening Insights
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InsightCard
                            label="Listening Time"
                            value={`${insights?.totalHours || 0} hrs`}
                            icon={<IoTimeOutline />}
                            color="bg-blue-500/10 text-blue-500"
                        />
                        <InsightCard
                            label="Top Genre"
                            value={insights?.topGenre || 'None'}
                            icon={<IoSparklesOutline />}
                            color="bg-purple-500/10 text-purple-500"
                        />
                        <InsightCard
                            label="Daily Streak"
                            value={`${insights?.streakDays || 0} days`}
                            icon={<IoFlameOutline />}
                            color="bg-orange-500/10 text-orange-500"
                        />
                        <InsightCard
                            label="Completion"
                            value={`${insights?.completionRate || 0}%`}
                            icon={<IoHeartOutline />}
                            color="bg-red-500/10 text-red-500"
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                {isAuthenticated && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-4"
                        >
                            <div className="text-3xl p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{stat.label}</p>
                                <p className="text-2xl font-black">{stat.value}</p>
                            </div>
                        </motion.div>
                        ))}
                    </div>
                )}

                {/* Listening Activity section can be expanded later */}
            </div>
        </PageTemplate>
    );
};

const InsightCard = ({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-all"
    >
        <div className={`text-2xl p-3 rounded-xl ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
            <p className="text-xl font-black">{value}</p>
        </div>
    </motion.div>
);

export default Profile;
