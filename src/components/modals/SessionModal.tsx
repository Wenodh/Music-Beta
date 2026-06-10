import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoCopyOutline, IoShareOutline, IoPeopleOutline, IoLogInOutline, IoAddCircleOutline } from 'react-icons/io5';
import { QRCodeSVG } from 'qrcode.react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { startSession, joinSession, leaveSession } from '../../features/session/sessionSlice';
import { showToast } from '../../features/ui/uiSlice';

interface SessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendReaction: (emoji: string) => void;
}

const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose, onSendReaction }) => {
    const dispatch = useAppDispatch();
    const { roomCode, isHost, isJoined, participants, error } = useAppSelector(state => state.session);
    const { theme } = useAppSelector(state => state.ui);
    const userId = useAppSelector(state => state.auth.user?.id);
    const [joinCode, setJoinCode] = useState('');
    const [activeTab, setActiveTab] = useState<'manage' | 'join'>(isJoined ? 'manage' : 'join');

    const generateRoomCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleStartSession = () => {
        const code = generateRoomCode();
        dispatch(startSession(code));
        setActiveTab('manage');
        dispatch(showToast({ message: 'Session started!' }));
    };

    const handleJoinSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length === 6) {
            dispatch(joinSession(joinCode.toUpperCase()));
            setActiveTab('manage');
            dispatch(showToast({ message: 'Joined session!' }));
        } else {
            dispatch(showToast({ message: 'Invalid code', type: 'error' }));
        }
    };

    const handleLeaveSession = () => {
        dispatch(leaveSession());
        onClose();
        dispatch(showToast({ message: 'Left session' }));
    };

    const copyLink = () => {
        const link = `${window.location.origin}?room=${roomCode}`;
        navigator.clipboard.writeText(link);
        dispatch(showToast({ message: 'Link copied!' }));
    };

    const shareSession = async () => {
        const link = `${window.location.origin}?room=${roomCode}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'VibeOn Group Session',
                    text: `Join my listening session on VibeOn! Code: ${roomCode}`,
                    url: link,
                });
            } catch (err) { console.log(err); }
        } else {
            copyLink();
        }
    };

    const emojis = ['❤️', '🔥', '👏', '🙌', '🎉', '🎸', '🎵', '🕺'];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`relative w-full max-w-md overflow-hidden rounded-t-[32px] sm:rounded-[32px] shadow-2xl border-t sm:border border-white/10 ${theme.isOled ? 'bg-black' : 'bg-gray-900'} max-h-[90vh] flex flex-col`}
            >
                {/* Pull bar for mobile */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                            <IoPeopleOutline size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Group Session</h2>
                    </div>
                    <button aria-label="Close" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                        <IoClose size={24} />
                    </button>
                </div>

                {/* Tabs */}
                {!isJoined && (
                    <div className="flex p-2 gap-2 bg-white/5 mx-6 mt-6 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('join')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'join' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Join
                        </button>
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'manage' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Host
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {activeTab === 'join' && !isJoined && (
                        <form onSubmit={handleJoinSession} className="space-y-6 text-center">
                            <p className="text-gray-400 text-sm">Enter a 6-digit code to join a friend's session.</p>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                placeholder="ROOM CODE"
                                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-center text-2xl font-black tracking-widest focus:border-primary outline-none text-white"
                            />
                            <button
                                type="submit"
                                disabled={joinCode.length !== 6}
                                className="w-full bg-primary hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <IoLogInOutline size={24} /> Join Session
                            </button>
                        </form>
                    )}

                    {activeTab === 'manage' && !isJoined && (
                        <div className="space-y-6 text-center">
                            <p className="text-gray-400 text-sm">Start a new session and invite others to listen with you.</p>
                            <div className="p-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <IoPeopleOutline size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-500 text-xs uppercase font-bold tracking-widest">Collaborative Listening</p>
                            </div>
                            <button
                                onClick={handleStartSession}
                                className="w-full bg-primary hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <IoAddCircleOutline size={24} /> Start Session
                            </button>
                        </div>
                    )}

                    {(isJoined || (activeTab === 'manage' && isJoined)) && (
                        <div className="space-y-6">
                            {/* Session Info */}
                            <div className="flex flex-col items-center gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                                <div className="bg-white p-2 rounded-2xl">
                                    <QRCodeSVG value={`${window.location.origin}?room=${roomCode}`} size={120} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Room Code</p>
                                    <h3 className="text-3xl font-black text-white tracking-widest">{roomCode}</h3>
                                </div>
                                <div className="flex gap-2 w-full">
                                    <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 p-3 rounded-xl text-sm font-bold transition-all text-white">
                                        <IoCopyOutline /> Copy
                                    </button>
                                    <button onClick={shareSession} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 p-3 rounded-xl text-sm font-bold transition-all text-white">
                                        <IoShareOutline /> Share
                                    </button>
                                </div>
                            </div>

                            {/* Participants */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                                    <span>Participants ({participants.length})</span>
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {participants.map((p) => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden border border-primary/20">
                                                {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : p.name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">
                                                    {p.name} {p.id === userId && '(You)'}
                                                </p>
                                            </div>
                                            {p.isHost && (
                                                <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase">Host</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reactions */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">React</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {emojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => onSendReaction(emoji)}
                                            className="text-2xl p-2 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleLeaveSession}
                                className="w-full py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl transition-all border border-red-500/20"
                            >
                                {isHost ? 'End Session' : 'Leave Session'}
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 p-4 text-red-500 text-xs font-bold text-center border-t border-red-500/20">
                        {error}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default SessionModal;
