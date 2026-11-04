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
import { setActiveProfileView, setIsNotificationPanelOpen, setCloudFriends, setNotifications } from '../../features/social/socialSlice';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';
import { socialService } from '../../services/socialService';
import { socialNotificationService } from '../../services/socialNotificationService';
import { removeFriendLocal, getFriendsLocal } from '../../utils/friendsDb';
import { setFriendsList } from '../../features/friends/friendsSlice';
import { showToast } from '../../features/ui/uiSlice';
import { CallHistoryTab } from '../../features/friends/components/CallHistoryTab';
import { DiscoverTab } from '../../features/friends/components/DiscoverTab';
import { ActivityTab } from '../../features/friends/components/ActivityTab';
import { FriendProfileView } from '../../features/friends/components/FriendProfileView';
import { SocialNotificationsModal } from '../../features/friends/components/SocialNotificationsModal';

type SocialTab = 'chats' | 'calls' | 'discover' | 'activity';

export const FriendsModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isFriendsModalOpen, friendsList, activeFriendId, directMessages, isCallActive, activeCallFriend } = useAppSelector(
        (state) => state.friends
    );
    const { activeProfileView, unreadNotificationsCount, isNotificationPanelOpen } = useAppSelector(
        (state) => state.social
    );
    const { sendDirectMessage, callFriend, endCall, addNewFriend, userId } = useDirectCommunication();

    const [activeTab, setActiveTab] = useState<SocialTab>('chats');
    const [newFriendId, setNewFriendId] = useState('');
    const [newFriendName, setNewFriendName] = useState('');
    const [messageText, setMessageText] = useState('');
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isCallScreenExpanded, setIsCallScreenExpanded] = useState(true);
    const [callDuration, setCallDuration] = useState(0);

    // Load cloud friends and notifications when modal opens for authenticated users
    React.useEffect(() => {
        if (!isFriendsModalOpen) return;
        const authUser = (window as any)?.__testUser || null;
        // Check if user is authenticated via Supabase session
        import('../../lib/supabase').then(({ supabase }) => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const uid = session?.user?.id || (authUser ? authUser.id : null);
                if (uid) {
                    socialService.getFriends(uid).then((friends) => {
                        dispatch(setCloudFriends(friends));
                    }).catch(() => {});
                    socialNotificationService.getNotifications(uid).then((notifs) => {
                        dispatch(setNotifications(notifs));
                    }).catch(() => {});
                }
            });
        });
    }, [isFriendsModalOpen, dispatch]);

    // Call timer when direct call is active
    React.useEffect(() => {
        let timer: any = null;
        if (isCallActive) {
            setIsCallScreenExpanded(true);
            setCallDuration(0);
            timer = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isCallActive]);

    const formatCallDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isFriendsModalOpen) return null;

    const activeFriend = friendsList.find((f) => f.id === activeFriendId);
    const activeMessages = activeFriendId ? directMessages[activeFriendId] || [] : [];

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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="relative w-full h-[100dvh] sm:h-[88vh] sm:max-w-4xl sm:max-h-[760px] bg-gray-950 sm:bg-gray-900 border-0 sm:border border-white/10 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
                {/* Top Header */}
                <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-white/10 bg-white/5 shrink-0">
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
                                onClick={() => setActiveTab(t.id as SocialTab)}
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
                            onClick={() => onClose()}
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
                                    <span className="font-bold uppercase tracking-wider text-[10px]">Your Contacts ({friendsList.length})</span>
                                    <span className="text-[10px] text-gray-500">Saved on Device</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                                    {friendsList.length > 0 ? (
                                        friendsList.map((friend) => {
                                            const isActive = activeFriendId === friend.id;
                                            const friendMsgs = directMessages[friend.id] || [];
                                            const lastMsg = friendMsgs[friendMsgs.length - 1];

                                            return (
                                                <div
                                                    key={friend.id}
                                                    onClick={() => dispatch(setActiveFriendId(friend.id))}
                                                    className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                                                        isActive
                                                            ? 'bg-primary/20 border border-primary/30 text-white'
                                                            : 'hover:bg-white/5 text-gray-300 border border-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-black text-sm shrink-0 border border-white/10 shadow-sm">
                                                            {friend.name[0]?.toUpperCase()}
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
                                                            <p className="text-[10px] text-gray-400 truncate font-mono">
                                                                {lastMsg ? lastMsg.text : friend.id}
                                                            </p>
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
                            <div className={`flex-1 flex flex-col min-w-0 bg-gray-900/60 backdrop-blur-md ${
                                activeFriend ? 'flex' : 'hidden sm:flex'
                            }`}>
                                {activeFriend ? (
                                    <>
                                        {/* Conversation Sub-Header */}
                                        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-bold text-xs border border-white/10 shrink-0">
                                                    {activeFriend.name[0]?.toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{activeFriend.name}</p>
                                                    <p className="text-[9px] text-gray-400 font-mono truncate">{activeFriend.id}</p>
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
                                    </>
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

                {/* Persistent Call Banner / Mobile Full-screen Overlay when Active */}
                {isCallActive && activeCallFriend && (
                    <>
                        {/* Mobile Full-Screen Call Overlay */}
                        <AnimatePresence>
                            {isCallScreenExpanded ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col justify-between p-6 sm:hidden"
                                >
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => setIsCallScreenExpanded(false)}
                                            className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 active:bg-white/10"
                                            title="Minimize call screen"
                                            aria-label="Minimize call screen"
                                        >
                                            <IoChevronDown size={24} />
                                        </button>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-bold">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                                            <span>Active Call</span>
                                        </div>
                                        <div className="w-10" />
                                    </div>

                                    {/* Middle avatar & status */}
                                    <div className="flex flex-col items-center justify-center my-auto">
                                        <div className="relative mb-6">
                                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-green-500/30 border-4 border-white/10">
                                                {activeCallFriend.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="absolute inset-0 rounded-full border-2 border-green-400/50 animate-ping pointer-events-none" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-1">{activeCallFriend.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono mb-3">{activeCallFriend.id}</p>
                                        <p className="text-sm font-semibold text-green-400 tracking-wider">
                                            {formatCallDuration(callDuration)}
                                        </p>
                                    </div>

                                    {/* Call Control Buttons */}
                                    <div className="flex items-center justify-around max-w-xs mx-auto w-full pb-8">
                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className={`p-4 rounded-full flex flex-col items-center gap-1.5 transition-all shadow-lg active:scale-90 ${
                                                isMuted
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                            }`}
                                        >
                                            {isMuted ? <IoMicOffOutline size={26} /> : <IoMicOutline size={26} />}
                                            <span className="text-[10px] font-bold">{isMuted ? 'Unmute' : 'Mute'}</span>
                                        </button>

                                        <button
                                            onClick={endCall}
                                            className="p-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex flex-col items-center gap-1.5 transition-all shadow-xl shadow-red-600/40 active:scale-90"
                                            title="End Call"
                                            aria-label="End Call"
                                        >
                                            <IoCall size={28} className="rotate-[135deg]" />
                                            <span className="text-[10px] font-bold">End</span>
                                        </button>
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        {/* Minimized Banner for Desktop or Minimized Mobile */}
                        <div
                            onClick={() => setIsCallScreenExpanded(true)}
                            className="p-3 bg-green-950/90 border-t border-green-500/30 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 cursor-pointer hover:bg-green-950 transition-colors"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-green-500 text-white rounded-xl animate-pulse shrink-0">
                                    <IoCall size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-ping shrink-0" />
                                        <span className="text-xs font-bold text-white truncate">Call: {activeCallFriend.name}</span>
                                        <span className="text-[10px] text-green-400 font-mono font-bold ml-1">
                                            ({formatCallDuration(callDuration)})
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-green-300/80">P2P Audio Stream Active</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-2 rounded-xl border transition-all ${
                                        isMuted
                                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                            : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                                    }`}
                                    title={isMuted ? "Unmute" : "Mute"}
                                    aria-label={isMuted ? "Unmute" : "Mute"}
                                >
                                    {isMuted ? <IoMicOffOutline size={16} /> : <IoMicOutline size={16} />}
                                </button>
                                <button
                                    onClick={endCall}
                                    className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/20 active:scale-95"
                                >
                                    End Call
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};
