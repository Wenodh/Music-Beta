import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { IoSend, IoChatbubbleEllipsesOutline } from 'react-icons/io5';

interface SessionChatProps {
    sendMessage?: (text: string) => void;
}

export const SessionChat: React.FC<SessionChatProps> = ({ sendMessage }) => {
    const { messages } = useAppSelector((state) => state.session);
    const { user } = useAppSelector((state) => state.auth);
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
            if (sendMessage) {
                sendMessage(inputText.trim());
            }
            setInputText('');
        }
    };

    return (
        <div className="flex flex-col h-64 sm:h-72 bg-black/40 sm:bg-gray-900/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-inner">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/10 bg-white/5 shrink-0">
                <IoChatbubbleEllipsesOutline className="text-primary" size={17} />
                <span className="text-xs font-bold text-gray-200">Room Chat</span>
                <span className="ml-auto text-[9px] xs:text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full font-mono">
                    Ephemeral
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {messages.length > 0 ? (
                    messages.map((msg) => {
                        const isSelf = msg.userId === user?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                    <span className="text-[10px] font-semibold text-gray-400">
                                        {isSelf ? 'You' : msg.userName}
                                    </span>
                                    <span className="text-[9px] text-gray-500">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div
                                    className={`px-3.5 py-2 rounded-2xl text-xs sm:text-[13px] max-w-[85%] break-words leading-relaxed shadow-sm ${
                                        isSelf
                                            ? 'bg-primary text-white rounded-br-none shadow-primary/20'
                                            : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs italic text-center p-4">
                        <p>No messages yet.</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Say hello to everyone in the room!</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-2 sm:p-2.5 border-t border-white/10 bg-white/5 flex items-center gap-2 shrink-0">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-primary hover:bg-red-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-primary/20 active:scale-95 shrink-0"
                    aria-label="Send message"
                >
                    <IoSend size={15} />
                </button>
            </form>
        </div>
    );
};
