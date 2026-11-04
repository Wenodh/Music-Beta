import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose, IoCopyOutline, IoShareOutline, IoPeopleOutline, IoLogInOutline,
    IoAddCircleOutline, IoCallOutline, IoMicOutline, IoMicOffOutline,
    IoCompassOutline, IoRadioOutline, IoMusicalNotesOutline, IoGlobeOutline,
    IoLockClosedOutline, IoChevronBack, IoVolumeHighOutline, IoAlertCircleOutline,
    IoChatbubbleEllipsesOutline, IoCheckmarkCircleOutline
} from 'react-icons/io5';
import { QRCodeSVG } from 'qrcode.react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { startSession, joinSession, leaveSession, setParticipants } from '../../features/session/sessionSlice';
import { showToast } from '../../features/ui/uiSlice';
import { SessionChat } from '../session/SessionChat';

interface SessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendReaction: (emoji: string) => void;
    toggleCall?: () => Promise<void>;
    toggleMute?: () => void;
    sendMessage?: (text: string) => void;
}

const SessionModal: React.FC<SessionModalProps> = ({
    isOpen,
    onClose,
    onSendReaction,
    toggleCall,
    toggleMute,
    sendMessage
}) => {
    const dispatch = useAppDispatch();
    const { roomCode, partyName, isHost, isJoined, participants, isCallActive, isMuted, error, publicParties, connectionStatus, isSyncing } = useAppSelector(state => state.session);
    const { currentSong, isPlaying } = useAppSelector(state => state.musicPlayer);
    const { theme } = useAppSelector(state => state.ui);
    const userId = useAppSelector(state => state.auth.user?.id);
    const userName = useAppSelector(state => state.auth.user?.user_metadata?.full_name);

    const [joinCode, setJoinCode] = useState('');
    const [hostPartyName, setHostPartyName] = useState(`${userName || 'My'} Listening Party`);
    const [hostPartyDescription, setHostPartyDescription] = useState('');
    const [hostPartyCategory, setHostPartyCategory] = useState('Trending');
    const [hostIsPublic, setHostIsPublic] = useState(true);
    const [activeTab, setActiveTab] = useState<'discover' | 'join' | 'host'>(isJoined ? 'host' : 'discover');
    const [mobileSection, setMobileSection] = useState<'chat' | 'participants'>('chat');
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('Spam');
    const [reportDetails, setReportDetails] = useState('');

    const generateRoomCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleStartSession = (e: React.FormEvent) => {
        e.preventDefault();
        const code = generateRoomCode();
        dispatch(startSession({
            roomCode: code,
            partyName: hostPartyName.trim() || 'Listening Party',
            description: hostPartyDescription.trim(),
            category: hostPartyCategory,
            isPublic: hostIsPublic,
        }));
        setActiveTab('host');
        dispatch(setParticipants([{
            id: userId || 'host',
            name: `${userName || 'You'} (Host)`,
            isHost: true,
        }]));
        dispatch(showToast({ message: 'Listening Party started!' }));
    };

    const handleJoinSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length === 6) {
            dispatch(joinSession(joinCode.toUpperCase()));
            setActiveTab('host');
            dispatch(showToast({ message: 'Joined party!' }));
        } else {
            dispatch(showToast({ message: 'Enter a valid 6-character room code', type: 'error' }));
        }
    };

    const handleJoinPublicParty = (partyCode: string, name: string) => {
        dispatch(joinSession({ roomCode: partyCode, partyName: name }));
        setActiveTab('host');
        dispatch(showToast({ message: `Joined ${name}!` }));
    };

    const handleLeaveSession = () => {
        dispatch(leaveSession());
        setShowLeaveConfirm(false);
        onClose();
        dispatch(showToast({ message: isHost ? 'Party ended' : 'Left party' }));
    };

    const copyLink = () => {
        const link = `${window.location.origin}?room=${roomCode}`;
        navigator.clipboard.writeText(link);
        dispatch(showToast({ message: 'Party link copied!' }));
    };

    const shareSession = async () => {
        const link = `${window.location.origin}?room=${roomCode}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${partyName} on Vibe On`,
                    text: `Join my listening party "${partyName}" on Vibe On! Room code: ${roomCode}`,
                    url: link,
                });
            } catch (err) {
                console.log(err);
            }
        } else {
            copyLink();
        }
    };

    const emojis = ['❤️', '🔥', '👏', '🙌', '🎉', '🎸', '🎵', '🕺'];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className={`relative w-full h-[100dvh] sm:h-[88vh] sm:max-w-2xl sm:max-h-[820px] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border flex flex-col overflow-hidden transition-colors duration-200 ${
                    theme.isOled
                        ? 'bg-black text-white border-white/10'
                        : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-white/10'
                } pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {isJoined && (
                            <button
                                onClick={() => setShowLeaveConfirm(true)}
                                className="sm:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl active:bg-black/5 dark:active:bg-white/10"
                                aria-label="Leave or close party"
                            >
                                <IoChevronBack size={22} />
                            </button>
                        )}
                        <div className="p-2.5 rounded-2xl bg-primary/20 text-primary shrink-0 shadow-sm">
                            <IoRadioOutline size={22} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-black truncate leading-tight">
                                {isJoined ? partyName : 'Listening Parties'}
                            </h2>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1 font-semibold">
                                    <span className={`w-2 h-2 rounded-full ${
                                        connectionStatus === 'connected'
                                            ? 'bg-emerald-500 animate-pulse'
                                            : connectionStatus === 'connecting'
                                                ? 'bg-amber-500 animate-ping'
                                                : 'bg-gray-400'
                                    }`} />
                                    {isJoined ? (isSyncing ? 'Syncing...' : 'Synced Live') : 'Real-time Audio Room'}
                                </span>
                                {isJoined && (
                                    <>
                                        <span>•</span>
                                        <span className="font-mono font-bold text-primary">Code: {roomCode}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isJoined && (
                            <button
                                onClick={shareSession}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary rounded-xl hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors"
                                title="Share Party"
                            >
                                <IoShareOutline size={20} />
                            </button>
                        )}
                        <button
                            aria-label="Close"
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200/60 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <IoClose size={24} />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs when not in a party */}
                {!isJoined && (
                    <div className="flex p-1.5 gap-1.5 bg-gray-100 dark:bg-black/30 mx-4 sm:mx-6 mt-4 rounded-2xl border border-gray-200/80 dark:border-white/5 shrink-0">
                        <button
                            onClick={() => setActiveTab('discover')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'discover'
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <IoCompassOutline size={16} /> Discover
                        </button>
                        <button
                            onClick={() => setActiveTab('join')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'join'
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <IoLogInOutline size={16} /> Join Code
                        </button>
                        <button
                            onClick={() => setActiveTab('host')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'host'
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <IoAddCircleOutline size={16} /> Host Party
                        </button>
                    </div>
                )}

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
                    {/* DISCOVER TAB */}
                    {!isJoined && activeTab === 'discover' && (
                        <div className="space-y-4">
                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                                {['All', 'Trending', 'Active Now', 'Lo-Fi', 'Rock', 'Pop', 'Hip-Hop'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            partyService.fetchPublicParties(cat).then(res => {
                                                if (res) dispatch(setPublicParties(res));
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                                            selectedCategory === cat
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Live Public Parties ({publicParties.length})
                                </h3>
                                <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                    Real-time
                                </span>
                            </div>

                            {publicParties.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {publicParties.map((party) => (
                                        <div
                                            key={party.roomCode}
                                            className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 hover:border-primary/40 dark:hover:border-primary/40 transition-all flex flex-col justify-between shadow-sm group"
                                        >
                                            <div className="flex items-start gap-3 min-w-0 mb-3">
                                                {party.songArtwork ? (
                                                    <img
                                                        src={party.songArtwork}
                                                        alt={party.partyName}
                                                        className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-md border border-gray-200 dark:border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-xl shrink-0">
                                                        <IoMusicalNotesOutline size={24} />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                            {party.partyName}
                                                        </h4>
                                                        {party.category && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                                                {party.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {party.description && (
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mb-1">
                                                            {party.description}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                                                        Host: <span className="font-semibold text-gray-900 dark:text-gray-200">{party.hostName}</span>
                                                    </p>
                                                    {party.songTitle && (
                                                        <p className="text-[10px] text-primary truncate font-semibold mt-1">
                                                            🎵 {party.songTitle} {party.songArtist ? `• ${party.songArtist}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 dark:border-white/5">
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                                    <IoPeopleOutline size={14} className="text-primary" />
                                                    {party.participantCount} listening
                                                </span>
                                                <button
                                                    onClick={() => handleJoinPublicParty(party.roomCode, party.partyName)}
                                                    className="px-3.5 py-1.5 bg-primary hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95 flex items-center gap-1"
                                                >
                                                    <IoLogInOutline size={15} /> Join
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-gray-300 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <div className="p-4 rounded-2xl bg-primary/10 text-primary w-fit mx-auto mb-3">
                                        <IoRadioOutline size={36} />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Public Parties Right Now</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                                        Be the first to host a party and invite friends to listen together, or join a private room using a code.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('host')}
                                        className="px-4 py-2 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all inline-flex items-center gap-1.5"
                                    >
                                        <IoAddCircleOutline size={16} /> Host a Party Now
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* JOIN WITH CODE TAB */}
                    {!isJoined && activeTab === 'join' && (
                        <form onSubmit={handleJoinSession} className="space-y-5 text-center max-w-sm mx-auto py-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Enter Room Code</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">
                                    Have a 6-digit code or link from a friend? Enter it below to tune in instantly.
                                </p>
                            </div>

                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                placeholder="ROOM CODE"
                                className="w-full bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl p-4 text-center text-3xl font-black tracking-widest focus:border-primary outline-none text-gray-900 dark:text-white font-mono uppercase shadow-inner"
                            />

                            <button
                                type="submit"
                                disabled={joinCode.length !== 6}
                                className="w-full bg-primary hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98"
                            >
                                <IoLogInOutline size={20} /> Join Listening Party
                            </button>
                        </form>
                    )}

                    {/* HOST PARTY TAB */}
                    {!isJoined && activeTab === 'host' && (
                        <form onSubmit={handleStartSession} className="space-y-4 max-w-md mx-auto py-2">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Host a Listening Party</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">
                                    Stream audio synchronously with your friends. Playback, pause, and seek will sync across all participants.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">Party Name</label>
                                    <input
                                        type="text"
                                        value={hostPartyName}
                                        onChange={(e) => setHostPartyName(e.target.value)}
                                        placeholder="e.g. Chill Lo-Fi Evening"
                                        className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        value={hostPartyDescription}
                                        onChange={(e) => setHostPartyDescription(e.target.value)}
                                        placeholder="e.g. Join in for relaxing chillhop tunes"
                                        className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">Music Category</label>
                                    <select
                                        value={hostPartyCategory}
                                        onChange={(e) => setHostPartyCategory(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:border-primary outline-none transition-colors"
                                    >
                                        {['Trending', 'Lo-Fi', 'Rock', 'Pop', 'Hip-Hop', 'Classical', 'Electronic'].map(cat => (
                                            <option key={cat} value={cat} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">Party Visibility</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setHostIsPublic(true)}
                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                                hostIsPublic
                                                    ? 'bg-primary/10 border-primary text-gray-900 dark:text-white shadow-sm'
                                                    : 'bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 font-bold text-xs text-primary">
                                                <IoGlobeOutline size={16} /> Public Party
                                            </div>
                                            <span className="text-[10px] text-gray-500 leading-tight">Listed in Discover for everyone to join</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setHostIsPublic(false)}
                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                                !hostIsPublic
                                                    ? 'bg-primary/10 border-primary text-gray-900 dark:text-white shadow-sm'
                                                    : 'bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 font-bold text-xs text-primary">
                                                <IoLockClosedOutline size={16} /> Private Party
                                            </div>
                                            <span className="text-[10px] text-gray-500 leading-tight">Accessible by room code or invite link only</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98 mt-4"
                            >
                                <IoAddCircleOutline size={20} /> Create & Start Party
                            </button>
                        </form>
                    )}

                    {/* ACTIVE GROUP SESSION (FULL-SCREEN MOBILE & DESKTOP SUITE) */}
                    {isJoined && (
                        <div className="space-y-4">
                            {/* Now Playing Banner with Visualizer & Progress */}
                            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/10 border border-gray-200 dark:border-white/10 shadow-md">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="relative shrink-0">
                                        {currentSong?.image?.[0]?.link ? (
                                            <img
                                                src={currentSong.image[currentSong.image.length - 1]?.link || currentSong.image[0].link}
                                                alt={currentSong.name}
                                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-lg border border-white/20"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-2xl">
                                                <IoMusicalNotesOutline size={30} />
                                            </div>
                                        )}
                                        {isPlaying && (
                                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse flex items-center justify-center">
                                                <IoVolumeHighOutline size={10} className="text-white" />
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Now Playing in Sync</span>
                                        </div>
                                        <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                                            {currentSong ? currentSong.name : 'No Song Playing'}
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                            {currentSong?.artist || 'Play music from player to sync'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Toggle Bar between Room Chat and Participants */}
                            <div className="flex sm:hidden p-1 gap-1 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 shrink-0">
                                <button
                                    onClick={() => setMobileSection('chat')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        mobileSection === 'chat'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <IoChatbubbleEllipsesOutline size={14} /> Room Chat
                                </button>
                                <button
                                    onClick={() => setMobileSection('participants')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        mobileSection === 'participants'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <IoPeopleOutline size={14} /> Participants ({participants.length})
                                </button>
                            </div>

                            {/* Desktop Split Layout or Mobile Tabbed Layout */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Left Column: Chat (visible on mobile if 'chat' selected, always on desktop) */}
                                <div className={`${mobileSection === 'chat' ? 'block' : 'hidden sm:block'}`}>
                                    <SessionChat sendMessage={sendMessage} />
                                </div>

                                {/* Right Column: Voice Call, Participants, Room Code & QR (visible on mobile if 'participants' selected) */}
                                <div className={`space-y-3.5 ${mobileSection === 'participants' ? 'block' : 'hidden sm:block'}`}>
                                    {/* Voice Call Bar */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`p-2 rounded-xl shrink-0 ${isCallActive ? 'bg-emerald-500/20 text-emerald-500 animate-pulse' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                                                <IoCallOutline size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                    {isCallActive ? 'Voice Chat Active' : 'Start Voice Chat'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    Peer-to-Peer Encrypted Voice
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isCallActive && (
                                                <button
                                                    onClick={toggleMute}
                                                    className={`p-2 rounded-xl border transition-all ${
                                                        isMuted
                                                            ? 'bg-red-500/20 border-red-500/30 text-red-500'
                                                            : 'bg-gray-200 dark:bg-white/10 border-gray-300 dark:border-white/10 text-gray-700 dark:text-white'
                                                    }`}
                                                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                                                >
                                                    {isMuted ? <IoMicOffOutline size={16} /> : <IoMicOutline size={16} />}
                                                </button>
                                            )}
                                            <button
                                                onClick={toggleCall}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    isCallActive
                                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20'
                                                        : 'bg-primary hover:bg-red-600 text-white shadow-md shadow-primary/20'
                                                }`}
                                            >
                                                {isCallActive ? 'Leave Call' : 'Join Call'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Participants List */}
                                    <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                Party Members ({participants.length})
                                            </span>
                                            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                            {participants.map((p) => (
                                                <div key={p.id} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-bold text-xs flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
                                                        {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : p.name[0]}
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate flex-1">
                                                        {p.name} {p.id === userId && '(You)'}
                                                    </p>
                                                    {p.isHost && (
                                                        <span className="text-[9px] font-bold bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase">
                                                            Host
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Room Code & Sharing Card */}
                                    <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 shrink-0">
                                                <QRCodeSVG value={`${window.location.origin}?room=${roomCode}`} size={44} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Room Code</span>
                                                <span className="text-lg font-black font-mono tracking-widest text-primary">{roomCode}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={copyLink}
                                                className="p-2 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-white text-xs font-bold transition-all"
                                                title="Copy Room Link"
                                            >
                                                <IoCopyOutline size={16} />
                                            </button>
                                            <button
                                                onClick={shareSession}
                                                className="p-2 rounded-xl bg-primary hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md shadow-primary/20"
                                                title="Share Invite"
                                            >
                                                <IoShareOutline size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Reaction Bar */}
                            <div className="pt-1">
                                <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 custom-scrollbar">
                                    {emojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => onSendReaction(emoji)}
                                            className="text-2xl p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 hover:scale-110 transition-transform"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Moderation & Leave Controls */}
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={() => setReportModalOpen(true)}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 transition-colors"
                                >
                                    Report Party
                                </button>
                                <button
                                    onClick={() => setShowLeaveConfirm(true)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <IoAlertCircleOutline size={16} /> {isHost ? 'End Party for Everyone' : 'Leave Party'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 p-3.5 text-red-500 text-xs font-bold text-center border-t border-red-500/20 shrink-0">
                        {error}
                    </div>
                )}

                {/* Report Abuse Modal */}
                <AnimatePresence>
                    {reportModalOpen && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 rounded-3xl max-w-xs w-full shadow-2xl text-left space-y-4"
                            >
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Report Party Content</h4>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-500">Reason</label>
                                    <select
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-2 text-xs"
                                    >
                                        <option value="Spam">Spam or unwanted advertising</option>
                                        <option value="Harassment">Harassment or abusive behavior</option>
                                        <option value="Inappropriate">Inappropriate content or title</option>
                                        <option value="Copyright">Copyright or intellectual property</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setReportModalOpen(false)}
                                        className="flex-1 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const res = await partyService.reportPartyOrUser({
                                                roomCode: roomCode || '',
                                                reason: reportReason,
                                                details: reportDetails
                                            });
                                            dispatch(showToast({ message: res.message, type: res.success ? 'success' : 'error' }));
                                            setReportModalOpen(false);
                                        }}
                                        className="flex-1 py-2 text-xs font-bold text-white bg-primary hover:bg-red-600 rounded-xl"
                                    >
                                        Submit
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Leave Confirmation Modal */}
                <AnimatePresence>
                    {showLeaveConfirm && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 rounded-3xl max-w-xs w-full shadow-2xl text-center space-y-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                                    <IoAlertCircleOutline size={26} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                                        {isHost ? 'End Listening Party?' : 'Leave Listening Party?'}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isHost ? 'Ending the party will disconnect all active listeners in this room.' : 'You will stop syncing music with the other listeners.'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowLeaveConfirm(false)}
                                        className="flex-1 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLeaveSession}
                                        className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-md shadow-red-600/20"
                                    >
                                        {isHost ? 'End Party' : 'Leave'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default SessionModal;
