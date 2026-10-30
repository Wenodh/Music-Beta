import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose, IoPeopleOutline, IoCall, IoSend, IoPersonAddOutline,
    IoTrashOutline, IoCopyOutline, IoChatbubblesOutline, IoCallOutline
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setIsFriendsModalOpen, setActiveFriendId } from '../../features/friends/friendsSlice';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';
import { removeFriendLocal, getFriendsLocal } from '../../utils/friendsDb';
import { setFriendsList } from '../../features/friends/friendsSlice';
import { showToast } from '../../features/ui/uiSlice';

export const FriendsModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isFriendsModalOpen, friendsList, activeFriendId, directMessages, isCallActive, activeCallFriend } = useAppSelector(
        (state) => state.friends
    );
    const { sendDirectMessage, callFriend, endCall, addNewFriend, userId } = useDirectCommunication();

    const [newFriendId, setNewFriendId] = useState('');
    const [newFriendName, setNewFriendName] = useState('');
    const [messageText, setMessageText] = useState('');

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
        dispatch(showToast({ message: 'Your User Code copied!' }));
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px]"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                            <IoPeopleOutline size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Friends & Direct Chat</h2>
                            <p className="text-[10px] text-gray-400">Your User Code: <span className="font-mono text-primary font-bold">{userId}</span></p>
                        </div>
                        <button onClick={copyMyCode} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors">
                            <IoCopyOutline size={14} />
                        </button>
                    </div>
                    <button onClick={() => dispatch(setIsFriendsModalOpen(false))} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                        <IoClose size={22} />
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Friends Sidebar */}
                    <div className="w-1/3 border-r border-white/10 flex flex-col bg-black/20">
                        <form onSubmit={handleAddFriend} className="p-3 border-b border-white/10 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Add Friend</p>
                            <input
                                type="text"
                                placeholder="Friend Name"
                                value={newFriendName}
                                onChange={(e) => setNewFriendName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 outline-none focus:border-primary"
                            />
                            <input
                                type="text"
                                placeholder="Friend User Code"
                                value={newFriendId}
                                onChange={(e) => setNewFriendId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 outline-none focus:border-primary"
                            />
                            <button
                                type="submit"
                                disabled={!newFriendId.trim() || !newFriendName.trim()}
                                className="w-full py-1.5 bg-primary hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-md shadow-primary/20"
                            >
                                <IoPersonAddOutline size={14} /> Add
                            </button>
                        </form>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {friendsList.length > 0 ? (
                                friendsList.map((friend) => {
                                    const isActive = activeFriendId === friend.id;
                                    return (
                                        <div
                                            key={friend.id}
                                            onClick={() => dispatch(setActiveFriendId(friend.id))}
                                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                                                isActive ? 'bg-primary/20 border border-primary/30 text-white' : 'hover:bg-white/5 text-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                    {friend.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold truncate">{friend.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); callFriend(friend); }}
                                                    className="p-1 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                                                    title="Call Friend"
                                                >
                                                    <IoCallOutline size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleRemoveFriend(e, friend.id)}
                                                    className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                                                    title="Remove Friend"
                                                >
                                                    <IoTrashOutline size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center py-8 text-[11px] text-gray-500 italic">No friends added yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-gray-900/50">
                        {activeFriend ? (
                            <>
                                <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                            {activeFriend.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{activeFriend.name}</p>
                                            <p className="text-[9px] text-gray-400 font-mono">{activeFriend.id}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => callFriend(activeFriend)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-green-500/20"
                                    >
                                        <IoCall size={14} /> Voice Call
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                                    {activeMessages.length > 0 ? (
                                        activeMessages.map((msg) => {
                                            const isSelf = msg.senderId === userId;
                                            return (
                                                <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                                                    <span className="text-[9px] text-gray-500 mb-0.5">{msg.senderName}</span>
                                                    <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[80%] break-words ${
                                                        isSelf ? 'bg-primary text-white rounded-br-none' : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                                                    }`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-gray-500 italic">
                                            No messages yet. Send a message to start chatting!
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder={`Message ${activeFriend.name}...`}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-primary"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageText.trim()}
                                        className="p-2 bg-primary hover:bg-red-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-primary/20"
                                    >
                                        <IoSend size={15} />
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                                <IoChatbubblesOutline size={48} className="mb-3 opacity-20" />
                                <p className="text-sm font-semibold">Select a friend to start chatting or calling</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Call Overlay Status if Active */}
                {isCallActive && activeCallFriend && (
                    <div className="p-3 bg-green-500/20 border-t border-green-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IoCall className="text-green-400 animate-pulse" size={18} />
                            <span className="text-xs font-bold text-white">In Voice Call with {activeCallFriend.name}</span>
                        </div>
                        <button
                            onClick={endCall}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                            End Call
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};
