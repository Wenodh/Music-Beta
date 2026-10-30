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
            <div className="fixed inset-0 z-[600] flex items-top sm:items-start justify-center p-4 pt-10 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    className="pointer-events-auto w-full max-w-sm bg-gray-900/90 backdrop-blur-xl border border-green-500/40 rounded-3xl p-4 shadow-2xl shadow-green-500/20 flex items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-3 bg-green-500 text-white rounded-2xl animate-bounce">
                            <IoCall size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Incoming Voice Call</p>
                            <p className="text-sm font-black text-white truncate">{incomingCall.callerName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => declineIncomingCall(incomingCall.callerId)}
                            className="p-2.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl transition-all border border-red-500/30"
                            title="Decline Call"
                        >
                            <IoClose size={20} />
                        </button>
                        <button
                            onClick={() => acceptIncomingCall(incomingCall.callerId, incomingCall.callerName)}
                            className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all shadow-lg shadow-green-500/30 animate-pulse"
                            title="Accept Call"
                        >
                            <IoCall size={20} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
