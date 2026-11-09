import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    IoStatsChartOutline,
    IoPlay,
    IoPause,
    IoShareSocialOutline,
    IoMusicalNoteOutline,
    IoSparklesOutline,
    IoShieldCheckmarkOutline,
    IoVolumeHighOutline,
} from 'react-icons/io5';
import PageTemplate from '../components/PageTemplate';
import { setSessionModalOpen, showToast } from '../features/ui/uiSlice';
import { setSettingsOpen, playMusic, pauseMusic } from '../features/musicplayer/musicPlayerSlice';
import { setIsFriendsModalOpen } from '../features/friends/friendsSlice';
import { signOut, signInWithGoogle } from '../features/auth/authActions';
import { useNavigate } from 'react-router-dom';
import { RepairFavoritesModal } from '../components/modals/RepairFavoritesModal';
import { DownloadManagerModal } from '../components/modals/DownloadManagerModal';
import { EditProfileModal } from '../components/modals/EditProfileModal';
import { supabase } from '../lib/supabase';
import { useBackHandler } from '../hooks/useBackHandler';
import { backNavigationService } from '../services/backNavigationService';
import { getOfflineSongs } from '../utils/db';
import { socialService } from '../services/socialService';
import { setMyProfile, setSocialActiveTab } from '../features/social/socialSlice';
import { Song } from '../types/music';

const Profile: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // Redux selectors
    const { user, isAuthenticated, loading: authLoading } = useAppSelector((state) => state.auth);
    const { favorites, playlists, lastSynced } = useAppSelector((state) => state.library);
    const { recentlyPlayed, currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);
    const { myProfile, onlinePresenceMap } = useAppSelector((state) => state.social);

    // Dialog and sub-view states
    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [offlineCount, setOfflineCount] = useState(0);

    // Edit profile state (for Batch 3 baseline, full editing & storage integration in Batch 4)
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Register Profile dialogs with Centralized BackNavigationManager
    useBackHandler(isEditProfileOpen, {
        id: 'profile-edit-dialog',
        priority: backNavigationService.PRIORITY.MODAL_DIALOG + 10,
        onBack: () => setIsEditProfileOpen(false),
    });

    useBackHandler(isRepairModalOpen, {
        id: 'profile-repair-favorites-modal',
        priority: backNavigationService.PRIORITY.MODAL_DIALOG,
        onBack: () => setIsRepairModalOpen(false),
    });

    useBackHandler(isManagerModalOpen, {
        id: 'profile-download-manager-modal',
        priority: backNavigationService.PRIORITY.MODAL_DIALOG,
        onBack: () => setIsManagerModalOpen(false),
    });

    // Load offline song counts
    useEffect(() => {
        getOfflineSongs().then((songs) => setOfflineCount(songs.length)).catch(() => setOfflineCount(0));
    }, []);

    // Fetch and synchronize authoritative profile
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            socialService.getProfile(user.id).then((profile) => {
                if (profile) {
                    dispatch(setMyProfile(profile));
                    setDisplayName(profile.display_name || user.user_metadata?.full_name || '');
                    setUsername(profile.username || '');
                    setBio(profile.bio || '');
                    setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || '');
                } else {
                    setDisplayName(user.user_metadata?.full_name || '');
                    setAvatarUrl(user.user_metadata?.avatar_url || '');
                }
            });
        }
    }, [isAuthenticated, user?.id, dispatch]);

    // Format last synced date string
    const formatLastSynced = (dateString: string | null) => {
        if (!dateString) return 'Not Synced';
        const date = new Date(dateString);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Derive authentic Top Artists strictly from genuine favorites & listening history (no fabricated data)
    const topArtists = useMemo(() => {
        const artistCounts = new Map<string, { name: string; count: number; image?: string }>();

        const processSong = (song: Song) => {
            const rawArtist = song.primaryArtists || song.artist;
            if (!rawArtist || typeof rawArtist !== 'string') return;

            // Separate combined artist strings (e.g. "Artist A, Artist B")
            const names = rawArtist.split(',').map((a) => a.trim()).filter((a) => a.length > 0);
            names.forEach((name) => {
                const existing = artistCounts.get(name) || {
                    name,
                    count: 0,
                    image: (typeof song.image === 'string' ? song.image : song.image?.[0]?.link) || '',
                };
                existing.count += 1;
                artistCounts.set(name, existing);
            });
        };

        favorites.forEach(processSong);
        recentlyPlayed.forEach(processSong);

        return Array.from(artistCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
    }, [favorites, recentlyPlayed]);

    // Public / Collaborative Playlists strictly derived from actual playlist data
    const eligiblePlaylists = useMemo(() => {
        return playlists.filter((p) => p.isCollaborative || p.role === 'owner');
    }, [playlists]);

    // Handle Quick Track Playback
    const handlePlaySong = useCallback(
        (song: Song) => {
            if (currentSong?.id === song.id) {
                if (isPlaying) {
                    dispatch(pauseMusic());
                } else {
                    dispatch(playMusic({ forcePlay: true }));
                }
            } else {
                dispatch(playMusic({ ...song, forcePlay: true }));
            }
        },
        [currentSong?.id, isPlaying, dispatch]
    );

    // Profile Share Handler (Respects privacy settings)
    const handleShareProfile = async () => {
        if (!isAuthenticated || !user) {
            dispatch(showToast({ message: 'Sign in to share your profile', type: 'info' }));
            return;
        }

        if (myProfile?.is_private) {
            dispatch(
                showToast({
                    message: 'Your profile is set to Private. Non-friends will only see basic info.',
                    type: 'info',
                })
            );
        }

        const shareUrl = `${window.location.origin}/profile?id=${user.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${myProfile?.display_name || user.user_metadata?.full_name || 'Vibe On User'} on Vibe On`,
                    text: `Check out my music profile on Vibe On!`,
                    url: shareUrl,
                });
            } catch {
                // User cancelled or unsupported
            }
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            dispatch(showToast({ message: 'Profile link copied to clipboard!' }));
        }
    };

    // Save profile handler using comprehensive EditProfileModal and authoritative socialService
    const handleSaveProfile = async (updatedFields: any): Promise<boolean> => {
        if (!user) return false;

        try {
            const res = await socialService.updateProfile(user.id, updatedFields);
            if (!res.success) {
                dispatch(showToast({ message: res.error || 'Failed to update profile', type: 'error' }));
                return false;
            }

            if (res.data) {
                dispatch(setMyProfile(res.data));
            }
            dispatch(showToast({ message: 'Profile updated successfully!' }));
            return true;
        } catch (err: any) {
            dispatch(showToast({ message: err.message || 'Failed to update profile', type: 'error' }));
            return false;
        }
    };

    // Library Overview metrics
    const stats = [
        { label: 'Favorites', value: favorites.length, icon: <IoHeartOutline className="text-red-500" />, onClick: () => navigate('/library') },
        { label: 'Playlists', value: playlists.length, icon: <IoLibraryOutline className="text-blue-500" />, onClick: () => navigate('/library?tab=playlists') },
        { label: 'Recently Played', value: recentlyPlayed.length, icon: <IoTimeOutline className="text-emerald-500" />, onClick: () => navigate('/library') },
        { label: 'Offline Songs', value: offlineCount, icon: <IoCloudDownloadOutline className="text-amber-500" />, onClick: () => navigate('/library?tab=offline') },
    ];

    // Determine online presence status strictly if presence is reliable and privacy permits
    const isOnline = useMemo(() => {
        if (!user?.id) return false;
        if (myProfile && myProfile.show_online === false) return false;
        const state = onlinePresenceMap[user.id];
        return Boolean(state?.online);
    }, [user?.id, myProfile, onlinePresenceMap]);

    return (
        <PageTemplate title="Profile">
            <div className="space-y-8 md:space-y-12 pb-20">
                {/* 1. Profile Header / Hero */}
                {isAuthenticated && user ? (
                    <div className="relative rounded-3xl overflow-hidden border border-gray-200/80 dark:border-white/10 shadow-lg bg-white dark:bg-gray-900">
                        {/* Cover Banner (Mesh Gradient Theme) */}
                        <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-primary/30 via-purple-600/20 to-cyan-500/30 relative">
                            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button
                                    onClick={handleShareProfile}
                                    className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer"
                                    title="Share Profile"
                                >
                                    <IoShareSocialOutline size={18} />
                                </button>
                                <button
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer"
                                    title="Edit Profile"
                                >
                                    <IoPencilOutline size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Profile Info Row */}
                        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                                <div className="relative group">
                                    <img
                                        src={myProfile?.avatar_url || user.user_metadata?.avatar_url || '/vibeon-logo.png'}
                                        alt="Profile Avatar"
                                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-900 shadow-2xl object-cover bg-gray-200 dark:bg-gray-800"
                                    />
                                    {isOnline && (
                                        <span
                                            className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-md"
                                            title="Online"
                                        />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                                            {myProfile?.display_name || user.user_metadata?.full_name || 'Vibe User'}
                                        </h1>
                                        {/* Verified badge only rendered if trusted verification field is true */}
                                        {(user.user_metadata?.is_verified === true || (myProfile as any)?.is_verified === true) && (
                                            <IoShieldCheckmarkOutline className="text-primary shrink-0" size={20} title="Verified Account" />
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                                        @{myProfile?.username || user.email?.split('@')[0] || 'user'} • {user.email}
                                    </p>
                                    {myProfile?.bio && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md pt-0.5">
                                            {myProfile.bio}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                                        <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-bold">
                                            Cloud Synced: {formatLastSynced(lastSynced)}
                                        </span>
                                        {myProfile?.is_private && (
                                            <span className="px-2.5 py-0.5 bg-gray-200/60 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300 text-[10px] font-bold">
                                                Private Profile
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Account Quick Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-2.5">
                                <button
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                >
                                    <IoPencilOutline className="text-primary" size={15} /> Edit
                                </button>
                                <button
                                    onClick={() => setIsRepairModalOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    title="Repair incomplete favorites"
                                >
                                    <IoBuild className="text-primary" size={15} /> Repair
                                </button>
                                <button
                                    onClick={() => setIsManagerModalOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                    title="Manage offline downloads"
                                >
                                    <IoCloudDownloadOutline className="text-primary" size={15} /> Downloads
                                </button>
                                <button
                                    onClick={() => dispatch(signOut() as any)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                    title="Sign Out"
                                >
                                    <IoLogOutOutline size={16} /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 2. Polished Guest Onboarding Card */
                    <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20 backdrop-blur-md shadow-lg space-y-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-3 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                    <IoSparklesOutline /> Guest Mode Active
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                                    Unlock the Full Vibe On Experience
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                                    Sign in with Google to enable seamless cloud library synchronization, library backup, direct P2P messaging & calling, and group listening parties.
                                </p>
                            </div>
                            <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => dispatch(signInWithGoogle() as any)}
                                    disabled={authLoading}
                                    className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <IoPersonCircleOutline size={20} />
                                    <span>{authLoading ? 'Connecting...' : 'Sign In with Google'}</span>
                                </button>
                                <button
                                    onClick={() => dispatch(setSettingsOpen(true))}
                                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
                                >
                                    <IoSettingsOutline size={18} />
                                    <span>Settings</span>
                                </button>
                            </div>
                        </div>

                        {/* Guest Benefits Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-primary/10">
                            {[
                                { title: 'Cloud Synchronization', desc: 'Sync favorites and playlists across all your phones and laptops.' },
                                { title: 'Library Backup & Recovery', desc: 'Keep your curation safe from device loss or browser cache clears.' },
                                { title: 'Social Chat & Calling', desc: 'Connect with friends for end-to-end encrypted messaging & audio calls.' },
                                { title: 'Group Listening Parties', desc: 'Host real-time synchronized music sessions with collaborative chat.' },
                            ].map((benefit, i) => (
                                <div key={i} className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-2xl border border-gray-200/50 dark:border-white/5">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{benefit.title}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{benefit.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Genuine Now Playing or Recently Played Banner */}
                {currentSong && currentSong.id ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0">
                                <img
                                    src={(typeof currentSong.image === 'string' ? currentSong.image : currentSong.image?.[0]?.link) || '/vibeon-logo.png'}
                                    alt={currentSong.name}
                                    className="w-full h-full object-cover"
                                />
                                {isPlaying && (
                                    <div className="absolute inset-0 bg-black/40 flex items-end justify-center gap-0.5 p-1">
                                        <span className="w-1 bg-primary h-3 animate-pulse" />
                                        <span className="w-1 bg-primary h-4 animate-bounce" />
                                        <span className="w-1 bg-primary h-2 animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                                    <IoVolumeHighOutline /> Currently Playing
                                </span>
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {currentSong.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{currentSong.artist || currentSong.primaryArtists}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handlePlaySong(currentSong)}
                            className="p-3 bg-primary text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer ml-3 shrink-0"
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <IoPause size={18} /> : <IoPlay size={18} />}
                        </button>
                    </div>
                ) : recentlyPlayed.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-gray-200/60 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">
                                <IoTimeOutline size={20} />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recently Played</span>
                                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {recentlyPlayed[0].name}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate">{recentlyPlayed[0].artist}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handlePlaySong(recentlyPlayed[0])}
                            className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all ml-3 shrink-0"
                        >
                            Play Last
                        </button>
                    </div>
                ) : null}

                {/* 4. Listening Insights Shortcut */}
                <div
                    onClick={() => navigate('/stats')}
                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-all group shadow-sm"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-primary/20 text-primary rounded-xl group-hover:scale-105 transition-transform">
                            <IoStatsChartOutline size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">Listening Insights & Stats</h3>
                            <p className="text-xs text-gray-500">View real total playback duration, top artists, and listening trends</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-primary px-3.5 py-1.5 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                        View Insights →
                    </span>
                </div>

                {/* 5. Library Metrics Grid */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">Library Overview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={stat.onClick}
                                className="p-4 sm:p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-all group"
                            >
                                <div className="text-xl sm:text-2xl p-2.5 bg-gray-50 dark:bg-gray-800 w-fit rounded-xl group-hover:scale-110 transition-transform mb-2">
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{stat.label}</p>
                                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* 6. Music Identity: Authentic Top Artists */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <IoMusicalNoteOutline /> Top Artists (From Your Activity)
                        </h3>
                        {topArtists.length > 0 && (
                            <span className="text-[10px] text-gray-400">{topArtists.length} artists</span>
                        )}
                    </div>
                    {topArtists.length === 0 ? (
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/50 dark:border-white/5 text-center text-gray-400 text-xs">
                            No artist activity yet. Start liking and streaming songs to populate your music identity!
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {topArtists.map((artist) => (
                                <div
                                    key={artist.name}
                                    onClick={() => navigate(`/search?q=${encodeURIComponent(artist.name)}`)}
                                    className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/40 transition-all cursor-pointer text-center group"
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2 shadow-sm group-hover:scale-105 transition-transform">
                                        {artist.image ? (
                                            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                                                {artist.name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{artist.name}</p>
                                    <p className="text-[10px] text-gray-400">{artist.count} track{artist.count > 1 ? 's' : ''}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 7. Music Identity: Favorite Tracks Preview */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <IoHeartOutline /> Favorite Tracks
                        </h3>
                        {favorites.length > 0 && (
                            <button
                                onClick={() => navigate('/library')}
                                className="text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                                View All ({favorites.length}) →
                            </button>
                        )}
                    </div>
                    {favorites.length === 0 ? (
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/50 dark:border-white/5 text-center text-gray-400 text-xs">
                            Your favorites list is currently empty. Like songs by clicking the heart icon during playback!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {favorites.slice(0, 6).map((song) => {
                                const isCurrent = currentSong?.id === song.id;
                                const isCurrentPlaying = isCurrent && isPlaying;
                                return (
                                    <div
                                        key={song.id}
                                        className="p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between group hover:border-primary/40 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <img
                                                src={(typeof song.image === 'string' ? song.image : song.image?.[0]?.link) || '/vibeon-logo.png'}
                                                alt={song.name}
                                                className="w-11 h-11 rounded-xl object-cover shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                    {song.name}
                                                </p>
                                                <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePlaySong(song)}
                                            className="p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer shrink-0 ml-2"
                                            title={isCurrentPlaying ? 'Pause' : 'Play'}
                                        >
                                            {isCurrentPlaying ? <IoPause size={18} /> : <IoPlay size={18} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 8. Public / Collaborative Playlists */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <IoLibraryOutline /> Curated Playlists
                        </h3>
                        {eligiblePlaylists.length > 0 && (
                            <button
                                onClick={() => navigate('/library?tab=playlists')}
                                className="text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                                View All ({eligiblePlaylists.length}) →
                            </button>
                        )}
                    </div>
                    {eligiblePlaylists.length === 0 ? (
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/50 dark:border-white/5 text-center text-gray-400 text-xs">
                            No playlists created yet. Create a playlist from your library or add tracks from search!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {eligiblePlaylists.slice(0, 3).map((playlist) => (
                                <div
                                    key={playlist.id}
                                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                                    className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-primary/40 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                            <IoLibraryOutline size={18} />
                                        </div>
                                        {playlist.isCollaborative && (
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500">
                                                Collaborative
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{playlist.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 9. Social & Connections Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                        onClick={() => {
                            dispatch(setSocialActiveTab('chats'));
                            dispatch(setIsFriendsModalOpen(true));
                        }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-all group shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/20 text-primary rounded-xl group-hover:scale-105 transition-transform">
                                <IoPeopleOutline size={22} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Friends & Direct Chat</h4>
                                <p className="text-xs text-gray-500">P2P encrypted messaging and voice calls</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-primary">Open →</span>
                    </div>

                    <div
                        onClick={() => dispatch(setSessionModalOpen(true))}
                        className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-between cursor-pointer hover:bg-cyan-500/15 transition-all group shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-cyan-500/20 text-cyan-500 rounded-xl group-hover:scale-105 transition-transform">
                                <IoMusicalNoteOutline size={22} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Listening Party</h4>
                                <p className="text-xs text-gray-500">Real-time synchronized group playback</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-cyan-500">Join →</span>
                    </div>
                </div>

                {/* Comprehensive Edit Profile Modal */}
                {user && (
                    <EditProfileModal
                        isOpen={isEditProfileOpen}
                        onClose={() => setIsEditProfileOpen(false)}
                        currentProfile={myProfile}
                        currentUserId={user.id}
                        onSave={handleSaveProfile}
                    />
                )}

                {/* Modals */}
                <RepairFavoritesModal isOpen={isRepairModalOpen} onClose={() => setIsRepairModalOpen(false)} />
                <DownloadManagerModal isOpen={isManagerModalOpen} onClose={() => setIsManagerModalOpen(false)} />
            </div>
        </PageTemplate>
    );
};

export default Profile;
