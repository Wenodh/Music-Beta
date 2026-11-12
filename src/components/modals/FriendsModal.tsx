import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose,
    IoPeopleOutline,
    IoCall,
    IoSend,
    IoPersonAddOutline,
    IoTrashOutline,
    IoCopyOutline,
    IoChatbubblesOutline,
    IoCallOutline,
    IoVideocamOutline,
    IoArrowBack,
    IoCheckmarkOutline,
    IoCheckmarkDoneOutline,
    IoTimeOutline,
    IoMicOutline,
    IoMicOffOutline,
    IoChevronDown,
    IoNotificationsOutline,
    IoCompassOutline,
    IoRadioOutline,
} from 'react-icons/io5';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setIsFriendsModalOpen, setActiveFriendId } from '../../features/friends/friendsSlice';
import { setActiveProfileView, setIsNotificationPanelOpen, setCloudFriends, setNotifications, setSocialActiveTab } from '../../features/social/socialSlice';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';
import { useBackHandler } from '../../hooks/useBackHandler';
import { backNavigationService } from '../../services/backNavigationService';
import { socialService } from '../../services/socialService';
import { socialNotificationService } from '../../services/socialNotificationService';
import { removeFriendLocal, getFriendsLocal, saveFriendLocal } from '../../utils/friendsDb';
import { setFriendsList } from '../../features/friends/friendsSlice';
import { Friend } from '../../types/friends';
import { showToast } from '../../features/ui/uiSlice';
import { CallHistoryTab } from '../../features/friends/components/CallHistoryTab';
import { DiscoverTab } from '../../features/friends/components/DiscoverTab';
import { ActivityTab } from '../../features/friends/components/ActivityTab';
import { FriendProfileView } from '../../features/friends/components/FriendProfileView';
import { SocialNotificationsModal } from '../../features/friends/components/SocialNotificationsModal';

type SocialTab = 'chats' | 'calls' | 'discover' | 'activity';

export const FriendsModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isFriendsModalOpen, friendsList, activeFriendId, directMessages } = useAppSelector(
        (state) => state.friends
    );
    const { activeProfileView, unreadNotificationsCount, isNotificationPanelOpen, onlinePresenceMap, socialActiveTab, cloudFriends } = useAppSelector(
        (state) => state.social
    );
    const { sendDirectMessage, callFriend, addNewFriend, userId } = useDirectCommunication();

    const [activeTab, setActiveTab] = useState<SocialTab>(socialActiveTab || 'chats');

    // Sync tab with Redux socialActiveTab when changed externally (e.g. from SettingsDrawer or Profile)
    React.useEffect(() => {
        if (socialActiveTab && isFriendsModalOpen) {
            setActiveTab(socialActiveTab);
            // If switched to calls, discover, or activity, clear stale active friend chat view
            if (socialActiveTab !== 'chats' && activeFriendId) {
                dispatch(setActiveFriendId(null));
            }
            if (activeProfileView) {
                dispatch(setActiveProfileView(null));
            }
        }
    }, [socialActiveTab, isFriendsModalOpen, activeFriendId, activeProfileView, dispatch]);
    const [newFriendId, setNewFriendId] = useState('');
    const [newFriendName, setNewFriendName] = useState('');
    const [messageText, setMessageText] = useState('');
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

    // Auto-scroll to bottom on new messages or active friend switch
    React.useEffect(() => {
        if (activeFriendId && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeFriendId, directMessages[activeFriendId || '']?.length]);

    // Register nested sub-views in FriendsModal (Notifications, Active Chat, Profile, Add Friend)
    useBackHandler(isFriendsModalOpen && isNotificationPanelOpen, {
        id: 'friends-notifications-modal',
        priority: backNavigationService.PRIORITY.NESTED_SHEET_OR_MENU + 20,
        onBack: () => dispatch(setIsNotificationPanelOpen(false)),
    });

    useBackHandler(isFriendsModalOpen && isAddFriendOpen, {
        id: 'friends-add-friend-dialog',
        priority: backNavigationService.PRIORITY.NESTED_SHEET_OR_MENU + 10,
        onBack: () => setIsAddFriendOpen(false),
    });

    useBackHandler(isFriendsModalOpen && Boolean(activeProfileView), {
        id: 'friends-active-profile-view',
        priority: backNavigationService.PRIORITY.NESTED_SUB_VIEW + 10,
        onBack: () => dispatch(setActiveProfileView(null)),
    });

    useBackHandler(isFriendsModalOpen && Boolean(activeFriendId), {
        id: 'friends-active-chat-view',
        priority: backNavigationService.PRIORITY.NESTED_SUB_VIEW,
        onBack: () => dispatch(setActiveFriendId(null)),
    });

    // Load cloud friends and notifications when modal opens for authenticated users
    React.useEffect(() => {
        if (!isFriendsModalOpen) return;
        const authUser = (window as any)?.__testUser || null;
        // Check if user is authenticated via Supabase session
        import('../../lib/supabase').then(({ supabase }) => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const uid = session?.user?.id || (authUser ? authUser.id : null);
                if (uid) {
                    socialService.getFriends(uid).then(async (friends) => {
                        dispatch(setCloudFriends(friends));
                        // Automatically sync accepted cloud friends into local contacts for seamless chatting & calling
                        try {
                            const existingLocal = await getFriendsLocal();
                            const existingLocalIds = new Set(existingLocal.map((f) => f.id));
                            let updated = false;

                            for (const cf of friends) {
                                const friendId = cf.user_id_1 === uid ? cf.user_id_2 : cf.user_id_1;
                                if (!existingLocalIds.has(friendId)) {
                                    const friendObj: Friend = {
                                        id: friendId,
                                        name: cf.friend_profile?.display_name || cf.friend_profile?.username || 'Friend',
                                        addedAt: new Date(cf.created_at || Date.now()).getTime(),
                                    };
                                    await saveFriendLocal(friendObj);
                                    updated = true;
                                }
                            }
                            if (updated) {
                                const refreshedList = await getFriendsLocal();
                                dispatch(setFriendsList(refreshedList));
                            }
                        } catch (err) {
                            console.warn('[FriendsModal] Error syncing cloud friends to local contacts:', err);
                        }
                    }).catch(() => {});
                    socialNotificationService.getNotifications(uid).then((notifs) => {
                        dispatch(setNotifications(notifs));
                    }).catch(() => {});
                }
            });
        });
    }, [isFriendsModalOpen, dispatch]);

    // Merge friendsList with cloudFriends so logged-in users always see all their accepted contacts even before async local save resolves
    const combinedFriends: Friend[] = React.useMemo(() => {
        const map = new Map<string, Friend>();
        friendsList.forEach((f) => map.set(f.id, f));

        cloudFriends.forEach((cf) => {
            const friendId = cf.user_id_1 === userId ? cf.user_id_2 : cf.user_id_1;
            if (!map.has(friendId)) {
                map.set(friendId, {
                    id: friendId,
                    name: cf.friend_profile?.display_name || cf.friend_profile?.username || 'Friend',
                    addedAt: new Date(cf.created_at || Date.now()).getTime(),
                });
            }
        });

        return Array.from(map.values());
    }, [friendsList, cloudFriends, userId]);

    const activeFriend = combinedFriends.find((f) => f.id === activeFriendId);
    const activeMessages = activeFriendId ? directMessages[activeFriendId] || [] : [];

    if (!isFriendsModalOpen) return null;

    const handleAddFriend = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFriendId.trim() && newFriendName.trim()) {
            addNewFriend(newFriendId.trim(), newFriendName.trim());
            setNewFriendId('');
            setNewFriendName('');
            dispatch(showToast({ message: 'Friend added!' }));
        }
    };

    const handleRemoveFriend = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await removeFriendLocal(id);
        const list = await getFriendsLocal();
        dispatch(setFriendsList(list));
        dispatch(showToast({ message: 'Friend removed' }));
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeFriendId && messageText.trim()) {
            sendDirectMessage(activeFriendId, messageText.trim());
            setMessageText('');
        }
    };

    const copyMyCode = () => {
        navigator.clipboard.writeText(userId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        dispatch(showToast({ message: 'Your User Code copied!' }));
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="relative w-full h-[100dvh] sm:h-[88vh] sm:max-w-4xl sm:max-h-[760px] bg-gray-950 sm:bg-gray-900 border-0 sm:border border-white/10 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] will-change-transform"
            >
                {/* Top Header */}
                <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-white/10 bg-white/5 shrink-0 z-20">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Mobile Back Button when in active chat or profile */}
                        {(activeFriend || activeProfileView) && (
                            <button
                                onClick={() => {
                                    if (activeProfileView) {
                                        dispatch(setActiveProfileView(null));
                                    } else {
                                        dispatch(setActiveFriendId(null));
                                    }
                                }}
                                className="sm:hidden p-2 -ml-1 text-gray-300 hover:text-white rounded-xl active:bg-white/10 transition-colors"
                                aria-label="Back"
                            >
                                <IoArrowBack size={20} />
                            </button>
                        )}
                        <div className="p-2 rounded-xl bg-primary/20 text-primary shrink-0">
                            <IoPeopleOutline size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-white truncate">
                                {activeProfileView
                                    ? activeProfileView.display_name
                                    : activeFriend
                                    ? activeFriend.name
                                    : 'Vibe Social'}
                            </h2>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                <span>Code:</span>
                                <span className="font-mono text-primary font-bold truncate max-w-[120px] xs:max-w-[180px]">{userId}</span>
                                <button
                                    onClick={copyMyCode}
                                    className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors shrink-0"
                                    title="Copy my user code"
                                >
                                    {isCopied ? <IoCheckmarkOutline className="text-green-400" size={13} /> : <IoCopyOutline size={13} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Social Notifications Bell Icon */}
                        <button
                            onClick={() => dispatch(setIsNotificationPanelOpen(true))}
                            className="relative p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-all active:scale-95"
                            title="Social Notifications"
                            aria-label="Social Notifications"
                        >
                            <IoNotificationsOutline size={20} />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-primary text-white text-[9px] font-black rounded-full border-2 border-gray-900 animate-pulse">
                                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                </span>
                            )}
                        </button>

                        {/* Direct Add Contact Button */}
                        {activeTab === 'chats' && !activeFriend && !activeProfileView && (
                            <button
                                onClick={() => setIsAddFriendOpen(!isAddFriendOpen)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    isAddFriendOpen
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'bg-white/10 hover:bg-white/15 text-gray-200'
                                }`}
                            >
                                <IoPersonAddOutline size={14} />
                                <span className="hidden xs:inline">Add</span>
                            </button>
                        )}

                        <button
                            onClick={() => dispatch(setIsFriendsModalOpen(false))}
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            aria-label="Close modal"
                        >
                            <IoClose size={22} />
                        </button>
                    </div>
                </div>

                {/* Primary Top Tab Navigation */}
                {!activeProfileView && !activeFriend && (
                    <div className="flex items-center border-b border-white/10 bg-black/40 px-3 py-1.5 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                        {[
                            { id: 'chats', label: 'Chats', icon: <IoChatbubblesOutline size={15} /> },
                            { id: 'calls', label: 'Calls', icon: <IoCallOutline size={15} /> },
                            { id: 'discover', label: 'Discover', icon: <IoCompassOutline size={15} /> },
                            { id: 'activity', label: 'Activity', icon: <IoRadioOutline size={15} /> },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setActiveTab(t.id as SocialTab);
                                    dispatch(setSocialActiveTab(t.id as SocialTab));
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    activeTab === t.id
                                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {t.icon}
                                <span>{t.label}</span>
                            </button>
                        ))}
                        <Link
                            to="/community"
                            onClick={() => dispatch(setIsFriendsModalOpen(false))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-all shrink-0 ml-auto border border-primary/20"
                        >
                            <IoPeopleOutline size={15} />
                            <span>Community</span>
                        </Link>
                    </div>
                )}

                {/* Collapsible Add Friend Drawer */}
                <AnimatePresence>
                    {isAddFriendOpen && !activeFriend && activeTab === 'chats' && (
                        <motion.form
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={(e) => {
                                handleAddFriend(e);
                                setIsAddFriendOpen(false);
                            }}
                            className="border-b border-white/10 bg-black/40 p-3.5 space-y-2.5 shrink-0 overflow-hidden"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Connect with a Friend</span>
                                <span className="text-[10px] text-gray-400">P2P Encrypted · Direct Signaling</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Friend's Name / Nickname"
                                    value={newFriendName}
                                    onChange={(e) => setNewFriendName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-primary transition-colors"
                                />
                                <input
                                    type="text"
                                    placeholder="Friend's User Code (e.g. anon-x8y9...)"
                                    value={newFriendId}
                                    onChange={(e) => setNewFriendId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-primary font-mono transition-colors"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsAddFriendOpen(false)}
                                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newFriendId.trim() || !newFriendName.trim()}
                                    className="px-4 py-1.5 bg-primary hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
                                >
                                    <IoPersonAddOutline size={14} /> Add to Contacts
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Main Content Area based on Active Tab or Sub-views */}
                <div className="flex flex-1 min-h-0 relative overflow-hidden">
                    {/* If Friend Profile Sub-view is Active */}
                    {activeProfileView ? (
                        <FriendProfileView profile={activeProfileView} />
                    ) : activeTab === 'calls' ? (
                        <CallHistoryTab />
                    ) : activeTab === 'discover' ? (
                        <DiscoverTab />
                    ) : activeTab === 'activity' ? (
                        <ActivityTab />
                    ) : (
                        /* Default 'chats' tab: Contacts and conversation column */
                        <>
                            {/* Friends List Column */}
                            <div className={`w-full sm:w-72 md:w-80 border-r border-white/10 flex flex-col bg-black/30 shrink-0 ${
                                activeFriend ? 'hidden sm:flex' : 'flex'
                            }`}>
                                <div className="p-3 border-b border-white/5 flex items-center justify-between text-xs text-gray-400">
                                    <span className="font-bold uppercase tracking-wider text-[10px]">Your Contacts ({combinedFriends.length})</span>
                                    <span className="text-[10px] text-gray-500">Saved on Device</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                                    {combinedFriends.length > 0 ? (
                                        combinedFriends.map((friend) => {
                                            const isActive = activeFriendId === friend.id;
                                            const friendMsgs = directMessages[friend.id] || [];
                                            const lastMsg = friendMsgs[friendMsgs.length - 1];
                                            const unreadCount = friendMsgs.filter((m) => m.senderId !== userId && m.status !== 'seen').length;
                                            const rawPresence = onlinePresenceMap[friend.id];
                                            const isFriendOnline = Boolean(rawPresence?.online && (Date.now() - (rawPresence.lastSeen || 0) < 90000));
                                            const friendSong = isFriendOnline ? rawPresence?.currentSong : null;

                                            return (
                                                <div
                                                    key={friend.id}
                                                    onClick={() => dispatch(setActiveFriendId(friend.id))}
                                                    className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all relative ${
                                                        isActive
                                                            ? 'bg-primary/20 border border-primary/30 text-white'
                                                            : 'hover:bg-white/5 text-gray-300 border border-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="relative shrink-0">
                                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-black text-sm border border-white/10 shadow-sm">
                                                                {friend.name[0]?.toUpperCase()}
                                                            </div>
                                                            {/* Online presence badge */}
                                                            <span
                                                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                                                                    isFriendOnline ? 'bg-green-400 ring-2 ring-green-500/30' : 'bg-gray-600'
                                                                }`}
                                                                title={isFriendOnline ? 'Online' : 'Offline'}
                                                            />
                                                            {unreadCount > 0 && !isActive && (
                                                                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-primary text-white text-[9px] font-black rounded-full border-2 border-gray-900 animate-pulse">
                                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className="text-xs font-bold truncate text-white">{friend.name}</p>
                                                                {lastMsg && (
                                                                    <span className="text-[9px] text-gray-500 shrink-0">
                                                                        {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {friendSong?.isPlaying ? (
                                                                <p className="text-[10px] truncate text-primary font-medium flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping inline-block" />
                                                                    <span className="truncate">Listening to {friendSong.title}</span>
                                                                </p>
                                                            ) : (
                                                                <p className={`text-[10px] truncate font-mono ${unreadCount > 0 && !isActive ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                                                    {lastMsg ? lastMsg.text : (isFriendOnline ? 'Online' : friend.id)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 pl-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); callFriend(friend, 'audio'); }}
                                                            className="p-2 hover:bg-green-500/20 text-green-400 rounded-xl transition-colors active:scale-95"
                                                            title={`Voice Call ${friend.name}`}
                                                            aria-label={`Voice Call ${friend.name}`}
                                                        >
                                                            <IoCallOutline size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); callFriend(friend, 'video'); }}
                                                            className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors active:scale-95"
                                                            title={`Video Call ${friend.name}`}
                                                            aria-label={`Video Call ${friend.name}`}
                                                        >
                                                            <IoVideocamOutline size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleRemoveFriend(e, friend.id)}
                                                            className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-xl transition-colors active:scale-95"
                                                            title={`Remove ${friend.name}`}
                                                            aria-label={`Remove ${friend.name}`}
                                                        >
                                                            <IoTrashOutline size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
                                            <div className="p-3 bg-white/5 rounded-2xl mb-3 text-gray-500">
                                                <IoPeopleOutline size={28} />
                                            </div>
                                            <p className="text-xs font-bold text-gray-300 mb-1">No Friends Added</p>
                                            <p className="text-[11px] text-gray-500 max-w-[200px] mb-4">
                                                Share your User Code with a friend to start direct chatting and voice calling.
                                            </p>
                                            <button
                                                onClick={() => setIsAddFriendOpen(true)}
                                                className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                                            >
                                                <IoPersonAddOutline size={14} /> Add Friend
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Chat Conversation Column */}
                            <div className={`flex-1 flex flex-col min-w-0 h-full bg-gray-950 sm:bg-gray-900/60 backdrop-blur-md overflow-hidden ${
                                activeFriend ? 'flex' : 'hidden sm:flex'
                            }`}>
                                {activeFriend ? (
                                    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
                                        {/* Conversation Sub-Header */}
                                        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0 z-10">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-bold text-xs border border-white/10">
                                                        {activeFriend.name[0]?.toUpperCase()}
                                                    </div>
                                                    {/* Active Friend Header Presence Dot */}
                                                    {(() => {
                                                        const rawP = onlinePresenceMap[activeFriend.id];
                                                        const isOnline = Boolean(rawP?.online && (Date.now() - (rawP.lastSeen || 0) < 90000));
                                                        return (
                                                            <span
                                                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900 ${
                                                                    isOnline ? 'bg-green-400' : 'bg-gray-600'
                                                                }`}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{activeFriend.name}</p>
                                                    {(() => {
                                                        const rawP = onlinePresenceMap[activeFriend.id];
                                                        const isOnline = Boolean(rawP?.online && (Date.now() - (rawP.lastSeen || 0) < 90000));
                                                        const song = isOnline ? rawP?.currentSong : null;
                                                        if (song?.isPlaying) {
                                                            return (
                                                                <p className="text-[9px] text-primary truncate font-medium flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping inline-block" />
                                                                    <span className="truncate">Listening to {song.title}</span>
                                                                </p>
                                                            );
                                                        }
                                                        return (
                                                            <p className="text-[9px] truncate font-medium flex items-center gap-1">
                                                                <span className={isOnline ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                                                                    {isOnline ? 'Online' : 'Offline'}
                                                                </span>
                                                                <span className="text-gray-500">·</span>
                                                                <span className="text-gray-500 font-mono truncate">{activeFriend.id}</span>
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => callFriend(activeFriend, 'audio')}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-green-500/20 active:scale-95"
                                                    title="Start Voice Call"
                                                >
                                                    <IoCall size={13} />
                                                    <span className="hidden xs:inline">Voice</span>
                                                </button>
                                                <button
                                                    onClick={() => callFriend(activeFriend, 'video')}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                                                    title="Start Video Call"
                                                >
                                                    <IoVideocamOutline size={14} />
                                                    <span className="hidden xs:inline">Video</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Messages Feed */}
                                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
                                            {activeMessages.length > 0 ? (
                                                activeMessages.map((msg) => {
                                                    const isSelf = msg.senderId === userId;
                                                    return (
                                                        <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                                                            <div className="flex items-center gap-1.5 mb-1 px-1">
                                                                <span className="text-[9px] font-semibold text-gray-400">
                                                                    {isSelf ? 'You' : (msg.senderName || activeFriend.name)}
                                                                </span>
                                                                <span className="text-[8px] text-gray-500">
                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div className={`relative px-3.5 py-2 rounded-2xl text-xs sm:text-[13px] max-w-[85%] xs:max-w-[75%] break-words leading-relaxed shadow-sm flex flex-col ${
                                                                isSelf
                                                                    ? 'bg-primary text-white rounded-br-none shadow-primary/20'
                                                                    : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                                                            }`}>
                                                                <span>{msg.text}</span>
                                                                {isSelf && (
                                                                    <div className="self-end flex items-center gap-1 mt-0.5 -mb-0.5 text-[10px] text-white/80">
                                                                        {msg.status === 'seen' ? (
                                                                            <span className="flex items-center text-cyan-300 font-bold" title="Seen">
                                                                                <IoCheckmarkDoneOutline size={14} className="stroke-[2.5]" />
                                                                            </span>
                                                                        ) : msg.status === 'delivered' ? (
                                                                            <span className="flex items-center text-white/70" title="Delivered">
                                                                                <IoCheckmarkDoneOutline size={14} />
                                                                            </span>
                                                                        ) : msg.status === 'sent' ? (
                                                                            <span className="flex items-center text-white/60" title="Sent">
                                                                                <IoCheckmarkOutline size={14} />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center text-white/50" title="Sending">
                                                                                <IoTimeOutline size={12} className="animate-spin" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                                                    <div className="p-3 bg-white/5 rounded-2xl mb-2 text-gray-600">
                                                        <IoChatbubblesOutline size={28} />
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-400">End-to-End Direct Chat</p>
                                                    <p className="text-[11px] text-gray-500 max-w-[220px] mt-1">
                                                        Messages are stored locally on your device only.
                                                    </p>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Message Input Box */}
                                        <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 border-t border-white/10 bg-black/40 flex items-center gap-2 shrink-0">
                                            <input
                                                type="text"
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                placeholder={`Message ${activeFriend.name}...`}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-primary transition-colors"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!messageText.trim()}
                                                className="p-2.5 bg-primary hover:bg-red-600 disabled:opacity-40 text-white rounded-2xl transition-all shadow-md shadow-primary/20 active:scale-95 shrink-0"
                                                aria-label="Send Message"
                                            >
                                                <IoSend size={16} />
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                                        <IoChatbubblesOutline size={48} className="mb-3 opacity-20" />
                                        <p className="text-sm font-semibold text-gray-400">Select a friend to start chatting</p>
                                        <p className="text-xs text-gray-600 mt-1">or add a friend using their User Code</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Social Notifications Modal / Popover */}
                <SocialNotificationsModal
                    isOpen={isNotificationPanelOpen}
                    onClose={() => dispatch(setIsNotificationPanelOpen(false))}
                />

                </motion.div>
        </div>
    );
};
