import React, { useState, useEffect } from 'react';
import {
    IoSearchOutline,
    IoPersonAddOutline,
    IoCheckmarkOutline,
    IoCloseOutline,
    IoPeopleOutline,
    IoShieldCheckmarkOutline,
    IoLockClosedOutline,
    IoSyncOutline,
    IoTimeOutline,
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { socialService } from '../../../services/socialService';
import { UserProfile, Friendship } from '../../../types/social';
import {
    setFriendRequests,
    removeRequest,
    addOutgoingRequest,
    setActiveProfileView,
} from '../../social/socialSlice';
import { showToast } from '../../ui/uiSlice';

export const DiscoverTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { incomingRequests, outgoingRequests, isLoadingRequests } = useAppSelector(
        (state) => state.social
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [isMigratingGuest, setIsMigratingGuest] = useState(false);

    // Initial load of friend requests if user is authenticated
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            socialService.getFriendRequests(user.id).then((reqs) => {
                dispatch(setFriendRequests(reqs));
            });
        }
    }, [isAuthenticated, user?.id, dispatch]);

    // Debounced search
    useEffect(() => {
        if (!isAuthenticated) return;
        const q = searchQuery.trim();
        if (!q) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            const res = await socialService.searchProfiles(q, user?.id);
            setSearchResults(res);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, isAuthenticated, user?.id]);

    const handleSendRequest = async (targetProfile: UserProfile) => {
        if (!user?.id) return;
        setActionLoadingId(targetProfile.id);

        try {
            const res = await socialService.sendFriendRequest(targetProfile.id);
            if (res.success) {
                dispatch(showToast({ message: res.message || 'Friend request sent!' }));
                // Optimistically add to outgoing
                const newOutgoing: Friendship = {
                    id: `temp-${Date.now()}`,
                    user_id_1: user.id < targetProfile.id ? user.id : targetProfile.id,
                    user_id_2: user.id > targetProfile.id ? user.id : targetProfile.id,
                    requester_id: user.id,
                    recipient_id: targetProfile.id,
                    status: (res.status as any) || 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    friend_profile: targetProfile,
                };
                dispatch(addOutgoingRequest(newOutgoing));
            } else {
                dispatch(showToast({ message: res.message, type: 'info' }));
            }
        } catch (e: any) {
            dispatch(showToast({ message: e.message || 'Failed to send request', type: 'error' }));
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRespond = async (friendshipId: string, accept: boolean) => {
        setActionLoadingId(friendshipId);
        try {
            const res = await socialService.respondFriendRequest(friendshipId, accept);
            if (res.success) {
                dispatch(removeRequest(friendshipId));
                dispatch(showToast({ message: res.message }));
            } else {
                dispatch(showToast({ message: res.message, type: 'error' }));
            }
        } catch (e: any) {
            dispatch(showToast({ message: e.message || 'Action failed', type: 'error' }));
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCancelOutgoing = async (friendshipId: string) => {
        setActionLoadingId(friendshipId);
        try {
            const res = await socialService.cancelFriendRequest(friendshipId);
            if (res.success) {
                dispatch(removeRequest(friendshipId));
                dispatch(showToast({ message: 'Request cancelled' }));
            } else {
                dispatch(showToast({ message: res.message, type: 'error' }));
            }
        } catch (e: any) {
            dispatch(showToast({ message: e.message || 'Action failed', type: 'error' }));
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleGuestMigration = async () => {
        if (!user?.id) return;
        setIsMigratingGuest(true);
        try {
            const res = await socialService.migrateGuestData(user.id);
            dispatch(
                showToast({
                    message: `Migration complete! Migrated ${res.migratedContacts} contacts.`,
                })
            );
        } catch (e: any) {
            dispatch(showToast({ message: 'Migration failed: ' + e.message, type: 'error' }));
        } finally {
            setIsMigratingGuest(false);
        }
    };

    // If Guest Mode
    if (!isAuthenticated || !user) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black/20">
                <div className="w-16 h-16 rounded-3xl bg-primary/20 text-primary flex items-center justify-center mb-4">
                    <IoShieldCheckmarkOutline size={32} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Cloud Social Experience</h3>
                <p className="text-xs text-gray-400 max-w-sm leading-relaxed mb-6">
                    Sign in to connect with friends, discover people, send friend requests, and sync your music social activity across all devices.
                </p>
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-gray-300 max-w-xs text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <IoLockClosedOutline size={14} /> Guest Privacy Guaranteed
                    </div>
                    <p className="text-gray-400">
                        Your offline downloads, local call history, and P2P communication remain fully available in guest mode.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black/20 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {/* Search Input */}
            <div className="relative">
                <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find friends by username or display name..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-primary transition-colors"
                />
                {isSearching && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {/* Guest Migration Card */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-bold text-white">Import Device Contacts</p>
                    <p className="text-[10px] text-gray-400">Sync eligible local contacts to your cloud account</p>
                </div>
                <button
                    onClick={handleGuestMigration}
                    disabled={isMigratingGuest}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                    <IoSyncOutline className={isMigratingGuest ? 'animate-spin' : ''} size={14} />
                    <span>{isMigratingGuest ? 'Importing...' : 'Import'}</span>
                </button>
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary px-1">
                        Search Results ({searchResults.length})
                    </p>
                    {searchResults.length > 0 ? (
                        searchResults.map((profile) => {
                            const isPendingOutgoing = outgoingRequests.some(
                                (r) => r.recipient_id === profile.id || r.friend_profile?.id === profile.id
                            );
                            const isLoading = actionLoadingId === profile.id;

                            return (
                                <div
                                    key={profile.id}
                                    onClick={() => dispatch(setActiveProfileView(profile))}
                                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-black text-sm shrink-0 border border-white/10">
                                            {profile.display_name[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{profile.display_name}</p>
                                            <p className="text-[10px] text-gray-400 truncate font-mono">@{profile.username}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {isPendingOutgoing ? (
                                            <span className="px-2.5 py-1 bg-white/10 text-gray-300 text-[10px] font-bold rounded-xl flex items-center gap-1">
                                                <IoTimeOutline size={12} /> Pending
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSendRequest(profile)}
                                                disabled={isLoading}
                                                className="px-3 py-1.5 bg-primary hover:bg-red-600 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                            >
                                                <IoPersonAddOutline size={14} />
                                                <span>Add</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : !isSearching ? (
                        <p className="text-xs text-gray-500 px-1">No users found matching &ldquo;{searchQuery}&rdquo;</p>
                    ) : null}
                </div>
            )}

            {/* Incoming Requests Section */}
            {incomingRequests.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-400 px-1">
                        Incoming Requests ({incomingRequests.length})
                    </p>
                    {incomingRequests.map((req) => {
                        const prof = req.friend_profile;
                        const name = prof?.display_name || 'Vibe User';
                        const username = prof?.username ? `@${prof.username}` : req.requester_id;
                        const isLoading = actionLoadingId === req.id;

                        return (
                            <div
                                key={req.id}
                                onClick={() => prof && dispatch(setActiveProfileView(prof))}
                                className="p-3 rounded-2xl bg-green-950/20 border border-green-500/20 flex items-center justify-between gap-3 cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center text-green-400 font-black text-sm shrink-0 border border-white/10">
                                        {name[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{name}</p>
                                        <p className="text-[10px] text-gray-400 truncate font-mono">{username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleRespond(req.id, true)}
                                        disabled={isLoading}
                                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-sm active:scale-95"
                                        title="Accept Request"
                                        aria-label="Accept Request"
                                    >
                                        <IoCheckmarkOutline size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleRespond(req.id, false)}
                                        disabled={isLoading}
                                        className="p-2 bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-xl transition-all active:scale-95"
                                        title="Decline Request"
                                        aria-label="Decline Request"
                                    >
                                        <IoCloseOutline size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Outgoing Requests Section */}
            {outgoingRequests.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                        Sent Requests ({outgoingRequests.length})
                    </p>
                    {outgoingRequests.map((req) => {
                        const prof = req.friend_profile;
                        const name = prof?.display_name || 'Vibe User';
                        const username = prof?.username ? `@${prof.username}` : req.recipient_id;
                        const isLoading = actionLoadingId === req.id;

                        return (
                            <div
                                key={req.id}
                                className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-gray-400 font-black text-sm shrink-0 border border-white/10">
                                        {name[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{name}</p>
                                        <p className="text-[10px] text-gray-400 truncate font-mono">{username}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleCancelOutgoing(req.id)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty discovery state */}
            {!searchQuery.trim() && incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 px-4">
                    <div className="p-3 bg-white/5 rounded-2xl mb-3 text-gray-400">
                        <IoPeopleOutline size={26} />
                    </div>
                    <p className="text-xs font-bold text-gray-300 mb-1">Discover Music Friends</p>
                    <p className="text-[11px] text-gray-500 max-w-[220px]">
                        Search above by username to connect with other music lovers.
                    </p>
                </div>
            )}
        </div>
    );
};
