import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoCall,
    IoClose,
    IoMicOutline,
    IoMicOffOutline,
    IoVideocamOutline,
    IoVideocamOffOutline,
    IoVolumeHighOutline,
    IoVolumeMuteOutline,
    IoChevronDown,
    IoCameraReverseOutline,
    IoChatbubbleEllipsesOutline,
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setIsCallScreenExpanded } from '../../features/friends/friendsSlice';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';
import { InCallChatDrawer } from './InCallChatDrawer';
import { useBackHandler } from '../../hooks/useBackHandler';
import { backNavigationService } from '../../services/backNavigationService';

export const ActiveCallModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isCallActive, activeCall, isCallScreenExpanded, directMessages, waitingCall, callQuality } = useAppSelector((state) => state.friends);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const prevMsgCountRef = useRef(activeCall?.friendId ? directMessages[activeCall.friendId]?.length || 0 : 0);
    const {
        endCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        flipCamera,
        localStream,
        remoteStream,
    } = useDirectCommunication();

    const [durationSeconds, setDurationSeconds] = useState(0);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    // Track unread messages received while chat drawer is closed
    useEffect(() => {
        if (!activeCall?.friendId) return;
        const currentMessages = directMessages[activeCall.friendId] || [];
        const newCount = currentMessages.length;

        if (newCount > prevMsgCountRef.current) {
            const added = newCount - prevMsgCountRef.current;
            if (!isChatOpen) {
                setUnreadChatCount((prev) => prev + added);
            }
        }
        prevMsgCountRef.current = newCount;
    }, [directMessages, activeCall?.friendId, isChatOpen]);

    // Register in-call chat drawer with BackNavigationManager (closes drawer before call minimize)
    useBackHandler(isCallActive && isCallScreenExpanded && isChatOpen, {
        id: 'in-call-chat-drawer',
        priority: backNavigationService.PRIORITY.NESTED_SHEET_OR_MENU + 30,
        onBack: () => setIsChatOpen(false),
    });

    // Toggle chat drawer and clear unread count
    const handleToggleChat = () => {
        setIsChatOpen((prev) => {
            if (!prev) setUnreadChatCount(0);
            return !prev;
        });
    };

    // Duration timer
    useEffect(() => {
        if (!isCallActive || !activeCall?.connectedAt) {
            setDurationSeconds(0);
            return;
        }

        const interval = setInterval(() => {
            const secs = Math.floor((Date.now() - (activeCall.connectedAt || Date.now())) / 1000);
            setDurationSeconds(Math.max(0, secs));
        }, 1000);

        return () => clearInterval(interval);
    }, [isCallActive, activeCall?.connectedAt]);

    // Attach streams to video elements
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            if (localVideoRef.current.srcObject !== localStream) {
                localVideoRef.current.srcObject = localStream;
            }
        }
    }, [localStream, activeCall?.isVideoEnabled, isCallScreenExpanded]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            if (remoteVideoRef.current.srcObject !== remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        }
    }, [remoteStream, activeCall?.callType, isCallScreenExpanded]);

    if (!isCallActive || !activeCall || !isCallScreenExpanded) return null;

    const formatDuration = (totalSecs: number) => {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isVideoMode = activeCall.callType === 'video';
    const isConnected = activeCall.status === 'connected';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[500] bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-black text-slate-900 dark:text-white flex flex-col justify-between overflow-hidden"
            >
                {/* Video Calling Surface */}
                {isVideoMode && (
                    <div className="absolute inset-0 z-0 bg-slate-900 dark:bg-black flex items-center justify-center">
                        {/* Remote Video Feed */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Fallback if remote video is not yet rendered or disabled */}
                        {(!remoteStream || remoteStream.getVideoTracks().length === 0 || !activeCall.isRemoteVideoEnabled) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-gray-950/80 backdrop-blur-md">
                                <div className="w-28 h-28 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-4xl font-black text-primary mb-4">
                                    {activeCall.friendName[0]?.toUpperCase() || 'U'}
                                </div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{activeCall.friendName}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                    {!activeCall.isRemoteVideoEnabled && isConnected ? 'Remote camera is paused' : `${activeCall.status}...`}
                                </p>
                            </div>
                        )}

                        {/* Floating Draggable Local Camera Preview (PiP) */}
                        {activeCall.isVideoEnabled && localStream && (
                            <motion.div
                                drag
                                dragConstraints={{ left: 16, right: 280, top: 16, bottom: 480 }}
                                dragMomentum={false}
                                className="absolute top-20 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-300 dark:border-white/20 bg-slate-800 dark:bg-gray-900 z-20 cursor-grab active:cursor-grabbing"
                            >
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`w-full h-full object-cover ${activeCall.facingMode === 'user' ? '-scale-x-100' : ''}`}
                                />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Top Header / Bar */}
                <div className="relative z-10 p-4 sm:p-6 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between">
                    <button
                        onClick={() => dispatch(setIsCallScreenExpanded(false))}
                        className="p-2.5 rounded-2xl bg-slate-200/80 dark:bg-black/40 backdrop-blur-md hover:bg-slate-300 dark:hover:bg-black/60 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
                        title="Minimize Call"
                    >
                        <IoChevronDown size={22} />
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                            {isVideoMode ? 'Encrypted Video Call' : 'Encrypted Voice Call'}
                        </span>
                        <p className="text-xs font-mono text-slate-600 dark:text-gray-300 mt-0.5">
                            {isConnected ? formatDuration(durationSeconds) : activeCall.status}
                        </p>
                        {callQuality && callQuality.level !== 'unknown' && (
                            <span
                                className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${
                                    callQuality.level === 'poor' ? 'text-red-500' :
                                    callQuality.level === 'fair' ? 'text-amber-500' :
                                    callQuality.level === 'good' ? 'text-emerald-500' : 'text-green-500'
                                }`}
                                title={`RTT: ${callQuality.rttMs === null ? '—' : Math.round(callQuality.rttMs) + ' ms'} · Jitter: ${callQuality.jitterMs === null ? '—' : Math.round(callQuality.jitterMs) + ' ms'} · Packet loss: ${callQuality.packetLossPercent === null ? '—' : callQuality.packetLossPercent.toFixed(1) + '%'}`}
                            >
                                {callQuality.level} connection{callQuality.rttMs !== null ? ` · ${Math.round(callQuality.rttMs)} ms` : ''}
                            </span>
                        )}
                        {waitingCall && (
                            <span className="mt-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                {waitingCall.callerName} is waiting · End this call to answer
                            </span>
                        )}
                    </div>

                    <div className="w-10" />
                </div>

                {/* Center Content for Audio Mode */}
                {!isVideoMode && (
                    <div className="relative z-10 flex flex-col items-center justify-center my-auto px-6 text-center">
                        <div className="relative mb-6">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-emerald-500/30 border-4 border-white/20 dark:border-white/15">
                                {activeCall.friendName[0]?.toUpperCase() || 'U'}
                            </div>
                            {isConnected && (
                                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 dark:border-emerald-400/50 animate-ping pointer-events-none" />
                            )}
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-slate-900 dark:text-white">{activeCall.friendName}</h2>
                        <p className="text-xs font-mono text-slate-500 dark:text-gray-400 mb-2">{activeCall.friendId}</p>
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-white/5 border border-emerald-500/20 dark:border-white/10 text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                            {activeCall.status}
                        </span>
                    </div>
                )}

                {/* Bottom Control Bar */}
                <div className="relative z-10 p-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-md w-full bg-white/80 dark:bg-black/50 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl">
                        {/* Mute Toggle */}
                        <button
                            onClick={toggleMute}
                            className={`p-3.5 sm:p-4 rounded-2xl transition-all active:scale-95 flex flex-col items-center gap-1 ${
                                activeCall.isMuted
                                    ? 'bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/40'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-slate-200 dark:border-transparent'
                            }`}
                            title={activeCall.isMuted ? 'Unmute Mic' : 'Mute Mic'}
                        >
                            {activeCall.isMuted ? <IoMicOffOutline size={22} /> : <IoMicOutline size={22} />}
                            <span className="text-[9px] font-bold">{activeCall.isMuted ? 'Unmute' : 'Mute'}</span>
                        </button>

                        {/* Video Camera Toggle */}
                        <button
                            onClick={toggleVideo}
                            className={`p-3.5 sm:p-4 rounded-2xl transition-all active:scale-95 flex flex-col items-center gap-1 ${
                                !activeCall.isVideoEnabled
                                    ? 'bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/40'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-slate-200 dark:border-transparent'
                            }`}
                            title={activeCall.isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
                        >
                            {activeCall.isVideoEnabled ? <IoVideocamOutline size={22} /> : <IoVideocamOffOutline size={22} />}
                            <span className="text-[9px] font-bold">{activeCall.isVideoEnabled ? 'Video' : 'No Video'}</span>
                        </button>

                        {/* Flip Camera (When Video Active) */}
                        {activeCall.isVideoEnabled && (
                            <button
                                onClick={flipCamera}
                                className="p-3.5 sm:p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-slate-200 dark:border-transparent transition-all active:scale-95 flex flex-col items-center gap-1"
                                title="Flip Camera"
                            >
                                <IoCameraReverseOutline size={22} />
                                <span className="text-[9px] font-bold">Flip</span>
                            </button>
                        )}

                        {/* Speaker Output Toggle */}
                        <button
                            onClick={toggleSpeaker}
                            className={`p-3.5 sm:p-4 rounded-2xl transition-all active:scale-95 flex flex-col items-center gap-1 ${
                                activeCall.isSpeakerOn
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-slate-200 dark:border-transparent'
                            }`}
                            title="Speaker Output"
                        >
                            {activeCall.isSpeakerOn ? <IoVolumeHighOutline size={22} /> : <IoVolumeMuteOutline size={22} />}
                            <span className="text-[9px] font-bold">Speaker</span>
                        </button>

                        {/* In-Call Text Chat Toggle Button */}
                        <button
                            onClick={handleToggleChat}
                            className={`relative p-3.5 sm:p-4 rounded-2xl transition-all active:scale-95 flex flex-col items-center gap-1 ${
                                isChatOpen
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-slate-200 dark:border-transparent'
                            }`}
                            title="In-Call Chat"
                            aria-label="Open in-call chat"
                        >
                            <IoChatbubbleEllipsesOutline size={22} />
                            <span className="text-[9px] font-bold">Chat</span>

                            {/* Unread Message Badge Indicator */}
                            {unreadChatCount > 0 && !isChatOpen && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-black animate-pulse">
                                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                                </span>
                            )}
                        </button>

                        {/* End Call Button */}
                        <button
                            onClick={endCall}
                            className="p-3.5 sm:p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-xl shadow-red-600/40 active:scale-95 flex flex-col items-center gap-1"
                            title="End Call"
                        >
                            <IoCall size={22} className="rotate-[135deg]" />
                            <span className="text-[9px] font-bold">End</span>
                        </button>
                    </div>
                </div>

                {/* In-Call Text Chat Slide-Over Drawer */}
                <InCallChatDrawer
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    friendId={activeCall.friendId}
                    friendName={activeCall.friendName}
                />
            </motion.div>
        </AnimatePresence>
    );
};
