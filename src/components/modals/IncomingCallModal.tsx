import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCall, IoClose } from 'react-icons/io5';
import { useAppSelector } from '../../hooks/redux';
import { useDirectCommunication } from '../../hooks/useDirectCommunication';

export const IncomingCallModal: React.FC = () => {
    const { incomingCall } = useAppSelector((state) => state.friends);
    const { acceptIncomingCall, declineIncomingCall } = useDirectCommunication();

    if (!incomingCall) return null;

    return (
        <AnimatePresence>
            {/* Desktop Banner / Notification Mode */}
            <div className="hidden sm:flex fixed inset-x-0 top-0 z-[600] justify-center p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -60, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -60, scale: 0.92 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="pointer-events-auto w-full max-w-md bg-gray-900/95 backdrop-blur-2xl border border-green-500/40 rounded-3xl p-4 shadow-2xl shadow-green-500/25 flex items-center justify-between gap-3 ring-1 ring-white/10"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-green-500/40 shrink-0">
                                <IoCall size={22} className="animate-pulse" />
                            </div>
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-gray-950 animate-ping" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest block">Incoming Voice Call</span>
                            <p className="text-base font-black text-white truncate leading-tight mt-0.5">{incomingCall.callerName}</p>
                            <span className="text-[10px] text-gray-400">P2P Encrypted Audio</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => declineIncomingCall(incomingCall.callerId)}
                            className="flex items-center justify-center w-11 h-11 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl transition-all border border-red-500/30 active:scale-90"
                            title="Decline Call"
                            aria-label="Decline Call"
                        >
                            <IoClose size={22} />
                        </button>
                        <button
                            onClick={() => acceptIncomingCall(incomingCall.callerId, incomingCall.callerName)}
                            className="flex items-center justify-center w-11 h-11 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all shadow-lg shadow-green-500/30 active:scale-90 animate-pulse"
                            title="Accept Call"
                            aria-label="Accept Call"
                        >
                            <IoCall size={20} />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Mobile Full-Screen Incoming Call Screen */}
            <div className="sm:hidden fixed inset-0 z-[600] bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col justify-between p-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                <div className="text-center">
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest block mb-2">Incoming Voice Call</span>
                    <span className="text-[11px] text-gray-400">P2P Direct Encrypted</span>
                </div>

                <div className="flex flex-col items-center justify-center my-auto">
                    <div className="relative mb-6">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-green-500/40 border-4 border-white/10">
                            {incomingCall.callerName[0]?.toUpperCase()}
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75 pointer-events-none" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white text-center mb-1">{incomingCall.callerName}</h2>
                    <p className="text-xs text-gray-400 font-mono text-center">{incomingCall.callerId}</p>
                </div>

                <div className="flex items-center justify-around w-full max-w-xs mx-auto pb-6">
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => declineIncomingCall(incomingCall.callerId)}
                            className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-90 transition-transform"
                            title="Decline"
                            aria-label="Decline"
                        >
                            <IoClose size={32} />
                        </button>
                        <span className="text-xs font-semibold text-gray-300">Decline</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => acceptIncomingCall(incomingCall.callerId, incomingCall.callerName)}
                            className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/40 active:scale-90 animate-bounce transition-transform"
                            title="Accept"
                            aria-label="Accept"
                        >
                            <IoCall size={30} />
                        </button>
                        <span className="text-xs font-semibold text-green-400">Accept</span>
                    </div>
                </div>
            </div>
        </AnimatePresence>
    );
};
