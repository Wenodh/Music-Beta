import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoExpandOutline, IoMicOffOutline, IoVideocamOffOutline } from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setIsCallScreenExpanded } from '../../features/friends/friendsSlice';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';

export const VideoPipOverlay: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isCallActive, activeCall, isCallScreenExpanded } = useAppSelector((state) => state.friends);
    const { remoteStream } = useDirectCommunication();
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Show floating Video PiP ONLY when in an active video call, minimized, and with remote video available
    const isVisible = Boolean(
        isCallActive &&
        activeCall?.callType === 'video' &&
        !isCallScreenExpanded &&
        activeCall?.status === 'connected' &&
        activeCall?.isRemoteVideoEnabled
    );

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            if (videoRef.current.srcObject !== remoteStream) {
                videoRef.current.srcObject = remoteStream;
            }
        }
    }, [remoteStream, isVisible]);

    if (!isVisible || !activeCall) return null;

    return (
        <AnimatePresence>
            <motion.div
                drag
                dragConstraints={{ left: 12, right: window.innerWidth - 130, top: 60, bottom: window.innerHeight - 200 }}
                dragMomentum={false}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() => dispatch(setIsCallScreenExpanded(true))}
                className="fixed top-20 right-4 w-28 h-40 sm:w-36 sm:h-48 z-[360] rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-500/60 bg-gray-950 cursor-grab active:cursor-grabbing group select-none"
            >
                {/* Remote video element */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover pointer-events-none"
                />

                {/* Subtle dark gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

                {/* Top status badges */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white text-[10px]">
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/80 font-bold backdrop-blur-sm">
                        Live
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch(setIsCallScreenExpanded(true));
                        }}
                        className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white transition-colors"
                        title="Maximize"
                    >
                        <IoExpandOutline size={12} />
                    </button>
                </div>

                {/* Bottom friend name & mute indicator */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                    <p className="text-[10px] font-bold truncate max-w-[80px]">{activeCall.friendName}</p>
                    <div className="flex items-center gap-1">
                        {activeCall.isMuted && (
                            <span className="p-0.5 rounded bg-red-500/80 text-white">
                                <IoMicOffOutline size={10} />
                            </span>
                        )}
                        {!activeCall.isRemoteVideoEnabled && (
                            <span className="p-0.5 rounded bg-amber-500/80 text-white">
                                <IoVideocamOffOutline size={10} />
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
