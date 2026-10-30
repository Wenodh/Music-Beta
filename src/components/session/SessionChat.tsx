import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { useSession } from '../../hooks/useSession';
import { IoSend, IoChatbubbleEllipsesOutline } from 'react-icons/io5';

export const SessionChat: React.FC = () => {
    const { messages } = useAppSelector((state) => state.session);
    const { user } = useAppSelector((state) => state.auth);
    const { sendMessage } = useSession();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            sendMessage(inputText.trim());
            setInputText('');
        }
    };

    return (
        <div className="flex flex-col h-64 bg-gray-900/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-inner">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
                <IoChatbubbleEllipsesOutline className="text-primary" size={18} />
                <span className="text-xs font-bold text-gray-200">Room Live Chat</span>
                <span className="ml-auto text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                    Ephemeral (Zero Storage)
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                {messages.length > 0 ? (
                    messages.map((msg) => {
                        const isSelf = msg.userId === user?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-semibold text-gray-400">
                                        {msg.userName}
                                    </span>
                                    <span className="text-[9px] text-gray-500">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div
                                    className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] break-words ${
                                        isSelf
                                            ? 'bg-primary text-white rounded-br-none shadow-sm shadow-primary/20'
                                            : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs italic">
                        No messages yet. Say hello to the room!
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-2 border-t border-white/10 bg-white/5 flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2 bg-primary hover:bg-red-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-primary/20"
                >
                    <IoSend size={14} />
                </button>
            </form>
        </div>
    );
};
