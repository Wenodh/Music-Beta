import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoPlay, IoArrowBack, IoRefresh, IoWarningOutline } from 'react-icons/io5';

interface ArcadeExitModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    onResume: () => void;
    onRestart?: () => void;
    onExit: () => void;
}

export const ArcadeExitModal: React.FC<ArcadeExitModalProps> = ({
    isOpen,
    title = 'Game Paused',
    message = 'Are you sure you want to quit? Your active round progress may be lost.',
    onResume,
    onRestart,
    onExit,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm bg-gray-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 text-center text-white"
                    >
                        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <IoWarningOutline size={28} />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-xl font-black tracking-tight">{title}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed px-2">{message}</p>
                        </div>

                        <div className="flex flex-col gap-2.5 pt-2">
                            <button
                                onClick={onResume}
                                className="w-full py-3 bg-primary hover:bg-red-600 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <IoPlay size={16} /> Resume Game
                            </button>

                            {onRestart && (
                                <button
                                    onClick={onRestart}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <IoRefresh size={16} /> Restart Round
                                </button>
                            )}

                            <button
                                onClick={onExit}
                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 active:scale-95 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <IoArrowBack size={16} /> Exit to Arcade
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
