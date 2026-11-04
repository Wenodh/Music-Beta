import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoHeartOutline,
    IoLibraryOutline,
    IoTimeOutline,
    IoPersonCircleOutline,
    IoPeopleOutline,
    IoBuild,
    IoCloudDownloadOutline,
    IoPencilOutline,
    IoClose,
    IoCameraOutline,
    IoLogOutOutline,
    IoSettingsOutline,
    IoCheckmarkCircle,
    IoStatsChartOutline,
} from 'react-icons/io5';
import PageTemplate from '../components/PageTemplate';
import { setSessionModalOpen, showToast } from '../features/ui/uiSlice';
import { setSettingsOpen } from '../features/musicplayer/musicPlayerSlice';
import { signOut } from '../features/auth/authActions';
import { useNavigate } from 'react-router-dom';
import { RepairFavoritesModal } from '../components/modals/RepairFavoritesModal';
import { DownloadManagerModal } from '../components/modals/DownloadManagerModal';
import { supabase } from '../lib/supabase';
import { getOfflineSongs } from '../utils/db';

const Profile: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);

    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [offlineCount, setOfflineCount] = useState(0);

    // Edit profile state
    const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        getOfflineSongs().then((songs) => setOfflineCount(songs.length));
    }, []);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.full_name || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
        }
    }, [user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingProfile(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: displayName.trim(),
                    avatar_url: avatarUrl.trim(),
                },
            });

            if (error) throw error;
            dispatch(showToast({ message: 'Profile updated successfully!' }));
            setIsEditProfileOpen(false);
        } catch (err: any) {
            dispatch(showToast({ message: err.message || 'Failed to update profile', type: 'error' }));
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            dispatch(showToast({ message: 'Please select an image file', type: 'error' }));
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            dispatch(showToast({ message: 'Image must be under 3MB', type: 'error' }));
            return;
        }

        try {
            setIsSavingProfile(true);
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                throw new Error(uploadError.message || 'Storage bucket avatars not accessible');
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (data?.publicUrl) {
                setAvatarUrl(data.publicUrl);
                dispatch(showToast({ message: 'Avatar uploaded!' }));
            }
        } catch (err: any) {
            dispatch(showToast({ message: err.message || 'Upload failed. You can paste an image URL instead.', type: 'error' }));
        } finally {
            setIsSavingProfile(false);
        }
    };

    const stats = [
        { label: 'Favorites', value: favorites.length, icon: <IoHeartOutline className="text-red-500" />, onClick: () => navigate('/library') },
        { label: 'Playlists', value: playlists.length, icon: <IoLibraryOutline className="text-blue-500" />, onClick: () => navigate('/library?tab=playlists') },
        { label: 'Recently Played', value: recentlyPlayed.length, icon: <IoTimeOutline className="text-emerald-500" />, onClick: () => navigate('/library') },
        { label: 'Offline Songs', value: offlineCount, icon: <IoCloudDownloadOutline className="text-amber-500" />, onClick: () => navigate('/library?tab=offline') },
    ];

    return (
        <PageTemplate title="Profile">
            <div className="space-y-8 md:space-y-12 pb-16">
                {/* Header */}
                {isAuthenticated && user ? (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 bg-gray-50 dark:bg-gray-800/40 rounded-3xl backdrop-blur-sm border border-gray-200 dark:border-white/10 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                                <img
                                    src={user.user_metadata?.avatar_url || '/vibeon-logo.png'}
                                    alt="Profile"
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary shadow-2xl object-cover shrink-0"
                                />
                                <button
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                                    title="Edit Profile"
                                >
                                    <IoPencilOutline size={16} />
                                </button>
                            </div>
                            <div className="text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-1 text-gray-900 dark:text-white">
                                        {user.user_metadata?.full_name || 'Vibe On User'}
                                    </h1>
                                    <IoCheckmarkCircle className="text-primary shrink-0" size={20} title="Verified Vibe User" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">{user.email}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold">
                                    Cloud Synced
                                </span>
                            </div>
                        </div>

                        {/* Direct Account Quick Actions for Logged in User */}
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setIsEditProfileOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 transition-all active:scale-95 shadow-sm"
                            >
                                <IoPencilOutline className="text-primary" size={17} />
                                Edit Profile
                            </button>

                            <button
                                onClick={() => setIsRepairModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 transition-all active:scale-95 shadow-sm"
                                title="Repair missing favorite artwork and links"
                            >
                                <IoBuild className="text-primary" size={17} />
                                Repair Favorites
                            </button>

                            <button
                                onClick={() => setIsManagerModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 transition-all active:scale-95 shadow-sm"
                                title="Manage offline download queue"
                            >
                                <IoCloudDownloadOutline className="text-primary" size={17} />
                                Downloads
                            </button>

                            <button
                                onClick={() => dispatch(signOut() as any)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-xs sm:text-sm font-bold border border-red-500/20 transition-all active:scale-95"
                                title="Sign Out"
                            >
                                <IoLogOutOutline size={18} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl backdrop-blur-sm border border-gray-200 dark:border-white/10 shadow-sm">
                        <IoPersonCircleOutline size={80} className="text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Guest Profile</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">Sign in to sync your library, favorites, and playlists across all your devices.</p>
                        <button
                            onClick={() => dispatch(setSettingsOpen(true))}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <IoSettingsOutline size={18} />
                            Open Settings to Sign In
                        </button>
                    </div>
                )}

                {/* Listening Insights Banner */}
                <div
                    onClick={() => navigate('/stats')}
                    className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-all group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/20 text-primary rounded-xl group-hover:scale-105 transition-transform">
                            <IoStatsChartOutline size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">Listening Insights & Stats</h3>
                            <p className="text-xs text-gray-500">View total listening time, top artists, and listening trends</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                        View Insights →
                    </span>
                </div>

                {/* Music Statistics */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 px-1">Library Overview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                onClick={stat.onClick}
                                className="p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-all group"
                            >
                                <div className="text-2xl p-2.5 bg-gray-50 dark:bg-gray-800 w-fit rounded-xl group-hover:scale-110 transition-transform mb-3">
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{stat.label}</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Group Session Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-transparent border border-primary/20 rounded-3xl relative overflow-hidden group cursor-pointer"
                    onClick={() => dispatch(setSessionModalOpen(true))}
                >
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-2 text-gray-900 dark:text-white">
                                <IoPeopleOutline className="text-primary" /> Group Listening Session
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                Listen together with your friends in real-time. Start a collaborative party or join with a room code.
                            </p>
                        </div>
                        <button
                            className="bg-primary text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Start Session
                        </button>
                    </div>
                    <IoPeopleOutline className="absolute -right-8 -bottom-8 text-9xl text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </motion.div>

                {/* Edit Profile Modal */}
                <AnimatePresence>
                    {isEditProfileOpen && (
                        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsEditProfileOpen(false)}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h3>
                                    <button
                                        onClick={() => setIsEditProfileOpen(false)}
                                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"
                                    >
                                        <IoClose size={22} />
                                    </button>
                                </div>

                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="flex flex-col items-center gap-3 mb-4">
                                        <img
                                            src={avatarUrl || '/vibeon-logo.png'}
                                            alt="Preview"
                                            className="w-20 h-20 rounded-full border-2 border-primary object-cover"
                                        />
                                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                                            <IoCameraOutline size={16} />
                                            <span>Upload Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="Your Name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                                            Avatar URL (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="https://example.com/avatar.png"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditProfileOpen(false)}
                                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingProfile}
                                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all"
                                        >
                                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

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
