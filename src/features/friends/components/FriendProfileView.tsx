import React, { useState, useEffect } from 'react';
import {
    IoArrowBack,
    IoPersonCircleOutline,
    IoShieldCheckmarkOutline,
    IoCallOutline,
    IoVideocamOutline,
    IoChatbubbleOutline,
    IoPersonRemoveOutline,
    IoBanOutline,
    IoLockClosedOutline,
    IoMusicalNotesOutline,
} from 'react-icons/io5';
import { UserProfile } from '../../../types/social';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { setActiveProfileView, removeCloudFriend } from '../../social/socialSlice';
import { setActiveFriendId } from '../../friends/friendsSlice';
import { useDirectCommunication } from '../../../hooks/useDirectCommunication';
import { socialService } from '../../../services/socialService';
import { showToast } from '../../ui/uiSlice';
import { supabase } from '../../../lib/supabase';
import { blockUserLocal } from '../../../utils/friendsDb';

interface FriendProfileViewProps {
    profile: UserProfile;
}

export const FriendProfileView: React.FC<FriendProfileViewProps> = ({ profile }) => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { cloudFriends } = useAppSelector((state) => state.social);
    const { callFriend } = useDirectCommunication();

    const [favoriteSongs, setFavoriteSongs] = useState<any[]>([]);
    const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const isFriend = cloudFriends.some(
        (f) => f.user_id_1 === profile.id || f.user_id_2 === profile.id
    );

    // Fetch authorized public/friend favorites if profile is not strictly private
    useEffect(() => {
        let isMounted = true;
        const fetchFriendFavorites = async () => {
            if (profile.is_private && !isFriend) return;
            setIsLoadingFavorites(true);
            try {
                const { data, error } = await supabase
                    .from('favorites')
                    .select('song_id, song_data, created_at')
                    .eq('user_id', profile.id)
                    .limit(6);

                if (!error && data && isMounted) {
                    setFavoriteSongs(data.map((d: any) => d.song_data));
                }
            } catch (err) {
                console.warn('Failed to load friend favorites:', err);
            } finally {
                if (isMounted) setIsLoadingFavorites(false);
            }
        };

        fetchFriendFavorites();
        return () => {
            isMounted = false;
        };
    }, [profile.id, profile.is_private, isFriend]);

    const handleVoiceCall = () => {
        callFriend({ id: profile.id, name: profile.display_name, addedAt: Date.now() }, 'audio');
    };

    const handleVideoCall = () => {
        callFriend({ id: profile.id, name: profile.display_name, addedAt: Date.now() }, 'video');
    };

    const handleOpenChat = () => {
        dispatch(setActiveFriendId(profile.id));
        dispatch(setActiveProfileView(null));
    };

    const handleRemoveFriend = async () => {
        if (!confirm(`Remove ${profile.display_name} from friends?`)) return;
        setActionLoading(true);
        try {
            const res = await socialService.removeFriend(profile.id);
            if (res.success) {
                dispatch(removeCloudFriend(profile.id));
                dispatch(showToast({ message: 'Friend removed' }));
            } else {
                dispatch(showToast({ message: res.message, type: 'error' }));
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlockUser = async () => {
        if (!confirm(`Block ${profile.display_name}? They will no longer be able to call, message, or view your activity.`)) return;
        setActionLoading(true);
        try {
            // Block in local IndexedDB so offline P2P calls and messages from this user are rejected immediately
            await blockUserLocal(profile.id, 'Blocked from profile view');

            // If user is authenticated and target is a UUID, also block on cloud Supabase
            if (socialService.isValidUUID(profile.id)) {
                await socialService.blockUser(profile.id);
            }

            dispatch(removeCloudFriend(profile.id));
            dispatch(setActiveProfileView(null));
            dispatch(showToast({ message: 'User blocked' }));
        } catch (err: any) {
            dispatch(showToast({ message: err.message || 'Error blocking user', type: 'error' }));
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-950 overflow-y-auto custom-scrollbar">
            {/* Header / Sub-nav back */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                <button
                    onClick={() => dispatch(setActiveProfileView(null))}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-300 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <IoArrowBack size={16} />
                    <span>Back</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>@{profile.username}</span>
                </div>
            </div>

            {/* Profile Hero */}
            <div className="p-5 flex flex-col items-center text-center space-y-3">
                <div className="relative">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            className="w-24 h-24 rounded-full border-4 border-primary object-cover shadow-2xl"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl border-4 border-white/10">
                            {profile.display_name[0]?.toUpperCase()}
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white flex items-center justify-center gap-1.5">
                        {profile.display_name}
                        <IoShieldCheckmarkOutline className="text-primary" size={18} />
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">@{profile.username}</p>
                </div>

                {profile.bio && (
                    <p className="text-xs text-gray-300 max-w-sm leading-relaxed px-4">
                        {profile.bio}
                    </p>
                )}

                {/* Friendship & Action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                        onClick={handleVoiceCall}
                        className="px-3.5 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-green-500/20 active:scale-95 transition-all"
                    >
                        <IoCallOutline size={15} /> Voice
                    </button>
                    <button
                        onClick={handleVideoCall}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        <IoVideocamOutline size={16} /> Video
                    </button>
                    <button
                        onClick={handleOpenChat}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <IoChatbubbleOutline size={15} /> Chat
                    </button>
                </div>
            </div>

            {/* Favorite Music / Activity Section */}
            <div className="p-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <IoMusicalNotesOutline size={14} className="text-primary" /> Top Favorite Songs
                    </span>
                    <span className="text-[10px] text-gray-500">{favoriteSongs.length} tracks</span>
                </div>

                {profile.is_private && !isFriend ? (
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center text-gray-500">
                        <IoLockClosedOutline size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-300">Private Profile</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                            Connect as friends to view music activity.
                        </p>
                    </div>
                ) : isLoadingFavorites ? (
                    <div className="py-8 flex justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : favoriteSongs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {favoriteSongs.map((song, i) => (
                            <div
                                key={song.id || i}
                                className="p-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2.5"
                            >
                                <img
                                    src={song.image?.[0]?.link || song.image || '/vibeon-logo.png'}
                                    alt={song.name || song.title}
                                    className="w-9 h-9 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{song.name || song.title}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{song.primaryArtists || song.artist || 'Artist'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 py-4 text-center">No favorite songs shared yet.</p>
                )}
            </div>

            {/* Relationship Controls */}
            {isFriend && (
                <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                    <button
                        onClick={handleRemoveFriend}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <IoPersonRemoveOutline size={15} />
                        <span>Remove Friend</span>
                    </button>
                    <button
                        onClick={handleBlockUser}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 text-red-500/80 hover:text-red-400 transition-colors"
                    >
                        <IoBanOutline size={15} />
                        <span>Block User</span>
                    </button>
                </div>
            )}
        </div>
    );
};
