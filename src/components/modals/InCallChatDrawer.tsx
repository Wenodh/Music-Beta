import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose,
    IoSend,
    IoCheckmark,
    IoCheckmarkDone,
    IoTimeOutline,
    IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';
import { MessageStatus } from '../../utils/friendsDb';
import { markFriendMessagesSeen } from '../../features/friends/friendsSlice';

interface InCallChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    friendId: string;
    friendName: string;
}

export const InCallChatDrawer: React.FC<InCallChatDrawerProps> = ({
    isOpen,
    onClose,
    friendId,
    friendName,
}) => {
    const dispatch = useAppDispatch();
    const { sendDirectMessage, userId } = useDirectCommunication();
    const directMessages = useAppSelector((state) => state.friends.directMessages[friendId] || []);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Auto-scroll to latest message when new messages arrive or drawer opens, and mark as seen
    useEffect(() => {
        if (isOpen) {
            if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
            // Mark incoming messages as seen when chat drawer is open
            dispatch(markFriendMessagesSeen({ friendId }));
        }
    }, [directMessages.length, isOpen, dispatch, friendId]);

    // Focus input field when drawer opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 250);
        }
    }, [isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = inputText.trim();
        if (!text) return;

        setInputText('');
        await sendDirectMessage(friendId, text);
    };

    const renderStatusIcon = (status?: MessageStatus) => {
        switch (status) {
            case 'sending':
                return <IoTimeOutline className="text-gray-400 text-xs inline" title="Sending..." />;
            case 'sent':
                return <IoCheckmark className="text-gray-400 text-xs inline" title="Sent" />;
            case 'delivered':
                return <IoCheckmarkDone className="text-gray-400 text-xs inline" title="Delivered" />;
            case 'seen':
                return <IoCheckmarkDone className="text-emerald-400 text-xs inline" title="Seen" />;
            default:
                return null;
        }
    };

    const formatTimestamp = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for closing on mobile/tablet */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30"
                    />

                    {/* Slide-over Drawer Panel */}
                    <motion.aside
                        role="dialog"
                        aria-label={`In-call chat with ${friendName}`}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="absolute top-0 right-0 bottom-0 w-full sm:w-96 max-w-full bg-gray-950/90 backdrop-blur-2xl border-l border-white/10 z-40 flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* Drawer Header */}
                        <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-white/10 flex items-center justify-between bg-black/30">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-sm shadow-md">
                                    {friendName[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-bold text-white leading-tight truncate max-w-[160px] sm:max-w-[180px]">
                                        {friendName}
                                    </h3>
                                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                                        <IoShieldCheckmarkOutline size={11} />
                                        End-to-End Encrypted
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
                                title="Close in-call chat"
                                aria-label="Close chat drawer"
                            >
                                <IoClose size={20} />
                            </button>
                        </div>

                        {/* Message Transcript Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
                            {directMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-emerald-400">
                                        <IoShieldCheckmarkOutline size={24} />
                                    </div>
                                    <p className="text-xs font-semibold text-gray-300 mb-1">In-Call Messaging</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed max-w-[200px]">
                                        Messages sent during the call are end-to-end encrypted and saved to your chat history.
                                    </p>
                                </div>
                            ) : (
                                directMessages.map((msg) => {
                                    const isMine = msg.senderId === userId;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                                        >
                                            <div
                                                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                                                    isMine
                                                        ? 'bg-emerald-600 text-white rounded-tr-none'
                                                        : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                            <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 px-1 font-mono">
                                                <span>{formatTimestamp(msg.timestamp)}</span>
                                                {isMine && renderStatusIcon(msg.status)}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Footer (Keyboard-avoidant) */}
                        <form
                            onSubmit={handleSendMessage}
                            className="p-3.5 pb-[calc(env(safe-area-inset-bottom)+1rem)] border-t border-white/10 bg-black/40 flex items-center gap-2"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={`Message ${friendName}...`}
                                className="flex-1 px-4 py-2.5 rounded-2xl bg-white/10 text-white placeholder-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-white/10 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => handleSendMessage()}
                                disabled={!inputText.trim()}
                                className="p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-40 disabled:hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-500/20"
                                title="Send message"
                                aria-label="Send message"
                            >
                                <IoSend size={16} />
                            </button>
                        </form>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};
