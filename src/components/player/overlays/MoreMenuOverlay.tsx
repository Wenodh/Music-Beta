import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdBarChart, MdShowChart, MdBubbleChart, MdDonutLarge, MdApps, MdOutlineGraphicEq } from 'react-icons/md';
import { HiQueueList } from 'react-icons/hi2';
import { IoAddCircleOutline } from 'react-icons/io5';

interface MoreMenuOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    visualizerStyle: string;
    onSetVisualizerStyle: (style: any) => void;
    onOpenQueue: () => void;
    onOpenInfo: () => void;
    onOpenEqualizer: () => void;
    onOpenPlaylist: () => void;
    accentColor: string;
}

const MoreMenuOverlay: React.FC<MoreMenuOverlayProps> = ({
    isOpen,
    onClose,
    visualizerStyle,
    onSetVisualizerStyle,
    onOpenQueue,
    onOpenInfo,
    onOpenEqualizer,
    onOpenPlaylist,
    accentColor
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[240] bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-[250] bg-gray-900 rounded-t-[32px] p-6 pb-12 border-t border-white/10"
                    >
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8" />

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {[
                                { id: 'bars', label: 'Bars', icon: <MdBarChart size={24} /> },
                                { id: 'waveform', label: 'Wave', icon: <MdShowChart size={24} /> },
                                { id: 'particles', label: 'Bubbles', icon: <MdBubbleChart size={24} /> },
                                { id: 'circular', label: 'Ring', icon: <MdDonutLarge size={24} /> },
                            ].map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => {
                                        onSetVisualizerStyle(style.id);
                                        onClose();
                                    }}
                                    className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${visualizerStyle === style.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-300'}`}
                                    style={visualizerStyle === style.id ? { backgroundColor: accentColor } : {}}
                                >
                                    {style.icon}
                                    <span className="font-bold text-sm">{style.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={onOpenQueue}
                                className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-gray-200 active:scale-[0.98] transition-all"
                            >
                                <HiQueueList size={24} />
                                <span className="font-bold">Playing Queue</span>
                            </button>
                            <button
                                onClick={onOpenInfo}
                                className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-gray-200 active:scale-[0.98] transition-all"
                            >
                                <MdApps size={24} />
                                <span className="font-bold">Track Details</span>
                            </button>
                            <button
                                onClick={onOpenEqualizer}
                                className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-gray-200 active:scale-[0.98] transition-all"
                            >
                                <MdOutlineGraphicEq size={24} />
                                <span className="font-bold">Equalizer</span>
                            </button>
                            <button
                                onClick={onOpenPlaylist}
                                className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-gray-200 active:scale-[0.98] transition-all"
                            >
                                <IoAddCircleOutline size={24} />
                                <span className="font-bold">Add to Playlist</span>
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-6 py-4 rounded-2xl bg-white/10 font-bold text-gray-400"
                        >
                            Close
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MoreMenuOverlay;
