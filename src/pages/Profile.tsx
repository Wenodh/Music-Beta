import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { motion } from 'framer-motion';
import { IoHeartOutline, IoLibraryOutline, IoTimeOutline, IoPersonCircleOutline, IoPeopleOutline, IoBuild, IoCloudDownloadOutline } from 'react-icons/io5';
import PageTemplate from '../components/PageTemplate';
import { setSessionModalOpen } from '../features/ui/uiSlice';
import { useNavigate } from 'react-router-dom';
import { RepairFavoritesModal } from '../components/modals/RepairFavoritesModal';
import { DownloadManagerModal } from '../components/modals/DownloadManagerModal';

const Profile: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);

    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);

    const stats = [
        { label: 'Favorites', value: favorites.length, icon: <IoHeartOutline className="text-red-500" />, onClick: () => navigate('/library') },
        { label: 'Playlists', value: playlists.length, icon: <IoLibraryOutline className="text-blue-500" />, onClick: () => navigate('/library?tab=playlists') },
        { label: 'Recently Played', value: recentlyPlayed.length, icon: <IoTimeOutline className="text-green-500" />, onClick: () => navigate('/library') },
    ];

    return (
        <PageTemplate title="Profile">
            <div className="space-y-8 md:space-y-12">
                {/* Header */}
                {isAuthenticated && user ? (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 bg-gray-50 dark:bg-gray-800/40 rounded-3xl backdrop-blur-sm border border-white/10">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <img
                                src={user.user_metadata?.avatar_url || '/vibeon-logo.png'}
                                alt="Profile"
                                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary shadow-2xl object-cover shrink-0"
                            />
                            <div className="text-center sm:text-left">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-1">
                                    {user.user_metadata?.full_name || 'Vibe On User'}
                                </h1>
                                <p className="text-gray-500 font-medium text-sm sm:text-base">{user.email}</p>
                            </div>
                        </div>

                        {/* Direct Account Quick Actions for Logged in User */}
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setIsRepairModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 transition-all active:scale-95 shadow-sm"
                                title="Repair missing favorite artwork and links"
                            >
                                <IoBuild className="text-primary" size={18} />
                                Repair Favorites
                            </button>

                            <button
                                onClick={() => setIsManagerModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 transition-all active:scale-95 shadow-sm"
                                title="Manage offline download queue"
                            >
                                <IoCloudDownloadOutline className="text-primary" size={18} />
                                Download Manager
                            </button>
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
                    className="p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-transparent border border-primary/20 rounded-3xl relative overflow-hidden group cursor-pointer"
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

                {/* Stats Grid */}
                {isAuthenticated && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={stat.onClick}
                                className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-all group"
                            >
                                <div className="text-3xl p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:scale-110 transition-transform">
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

                {/* Modals */}
                <RepairFavoritesModal
                    isOpen={isRepairModalOpen}
                    onClose={() => setIsRepairModalOpen(false)}
                />

                <DownloadManagerModal
                    isOpen={isManagerModalOpen}
                    onClose={() => setIsManagerModalOpen(false)}
                />
            </div>
        </PageTemplate>
    );
};

export default Profile;
