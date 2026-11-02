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
            <div className="fixed inset-x-0 top-0 z-[600] flex justify-center p-3 sm:p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -60, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -60, scale: 0.92 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="pointer-events-auto w-full max-w-md bg-gray-950/95 sm:bg-gray-900/95 backdrop-blur-2xl border border-green-500/40 rounded-[28px] p-3.5 sm:p-4 shadow-2xl shadow-green-500/25 flex items-center justify-between gap-3 ring-1 ring-white/10"
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
                            <p className="text-sm sm:text-base font-black text-white truncate leading-tight mt-0.5">{incomingCall.callerName}</p>
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
        </AnimatePresence>
    );
};
