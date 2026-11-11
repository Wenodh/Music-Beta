import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCall, IoMicOffOutline, IoMicOutline, IoVideocam, IoVolumeHighOutline, IoChevronUp } from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setIsCallScreenExpanded } from '../features/friends/friendsSlice';
import { useDirectCommunication } from '../hooks/useDirectCommunication';

export const ActiveCallBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isCallActive, activeCall, isCallScreenExpanded } = useAppSelector((state) => state.friends);
    const { endCall, toggleMute, toggleSpeaker } = useDirectCommunication();

    if (!isCallActive || !activeCall || isCallScreenExpanded) return null;

    const formatDuration = (connectedAt: number | null) => {
        if (!connectedAt) return activeCall.status;
        const totalSecs = Math.max(0, Math.floor((Date.now() - connectedAt) / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isRinging = activeCall.status === 'ringing';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                onClick={() => dispatch(setIsCallScreenExpanded(true))}
                className="fixed bottom-[calc(var(--player-pill-bottom,5.5rem)+0.5rem)] left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[340] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 cursor-pointer group text-slate-900 dark:text-white"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/30">
                        {activeCall.callType === 'video' ? <IoVideocam size={20} /> : <IoCall size={20} className="animate-pulse" />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping shrink-0" />
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{activeCall.friendName}</p>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium capitalize">
                            {activeCall.status === 'connected'
                                ? formatDuration(activeCall.connectedAt)
                                : isRinging
                                ? 'Calling...'
                                : activeCall.status}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isRinging && (
                        <>
                            <button
                                onClick={toggleMute}
                                className={`p-2 rounded-xl transition-colors ${
                                    activeCall.isMuted
                                        ? 'bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                                }`}
                                title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                            >
                                {activeCall.isMuted ? <IoMicOffOutline size={16} /> : <IoMicOutline size={16} />}
                            </button>
                            <button
                                onClick={toggleSpeaker}
                                className={`p-2 rounded-xl transition-colors ${
                                    activeCall.isSpeakerOn
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                                }`}
                                title="Speaker"
                            >
                                <IoVolumeHighOutline size={16} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={endCall}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                        {isRinging ? 'Cancel' : 'End'}
                    </button>
                    <button
                        onClick={() => dispatch(setIsCallScreenExpanded(true))}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
                        title="Maximize"
                    >
                        <IoChevronUp size={18} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
