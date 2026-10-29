import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloudDownloadOutline, IoClose, IoInformationCircleOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { Song } from '../../types/music';

interface BulkDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'all' | 'missing') => void;
    totalFavorites: Song[];
    downloadedIds: string[];
    preferredQuality: string;
}

export const BulkDownloadModal: React.FC<BulkDownloadModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    totalFavorites,
    downloadedIds,
    preferredQuality,
}) => {
    const [downloadMode, setDownloadMode] = useState<'missing' | 'all'>('missing');

    if (!isOpen) return null;

    const downloadedSet = new Set(downloadedIds);
    const downloadedCount = totalFavorites.filter(s => downloadedSet.has(s.id)).length;
    const missingCount = totalFavorites.length - downloadedCount;

    const targetCount = downloadMode === 'missing' ? missingCount : totalFavorites.length;

    // Calculate realistic storage estimate based on song durations and quality bitrate
    // Bitrate approximations: 320kbps ~2.4 MB/min, 160kbps ~1.2 MB/min, 96kbps ~0.7 MB/min, 48kbps ~0.36 MB/min, 12kbps ~0.1 MB/min
    const getMBPerMinute = (quality: string) => {
        if (quality.includes('320')) return 2.4;
        if (quality.includes('160')) return 1.2;
        if (quality.includes('96')) return 0.72;
        if (quality.includes('48')) return 0.36;
        if (quality.includes('12')) return 0.1;
        return 2.0; // default fallback
    };

    const targetSongs = downloadMode === 'missing'
        ? totalFavorites.filter(s => !downloadedSet.has(s.id))
        : totalFavorites;

    const totalSeconds = targetSongs.reduce((acc, song) => {
        const d = Number(song.duration);
        return acc + (!isNaN(d) && d > 0 ? d : 210); // default 3.5 min if duration unknown
    }, 0);

    const estimatedMB = Math.round((totalSeconds / 60) * getMBPerMinute(preferredQuality));
    const formattedEstimate = estimatedMB >= 1024
        ? `${(estimatedMB / 1024).toFixed(1)} GB`
        : `${estimatedMB} MB`;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                <IoCloudDownloadOutline size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Download Favorites</h2>
                                <p className="text-xs text-gray-500">Prepare for offline playback</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors"
                        >
                            <IoClose size={22} />
                        </button>
                    </div>

                    {/* Mode selection */}
                    <div className="space-y-3 mb-6">
                        <label className="text-xs font-bold text-gray-400 uppercase">Download Option</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDownloadMode('missing')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                                    downloadMode === 'missing'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm">Download Missing</span>
                                    {downloadMode === 'missing' && <IoCheckmarkCircleOutline size={18} />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Only songs not available offline ({missingCount})
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setDownloadMode('all')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                                    downloadMode === 'all'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm">Download All</span>
                                    {downloadMode === 'all' && <IoCheckmarkCircleOutline size={18} />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    All favorites in list ({totalFavorites.length})
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Details Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-2 mb-6 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Total Favorites</span>
                            <span className="font-bold">{totalFavorites.length} songs</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Already Downloaded</span>
                            <span className="font-bold text-green-500">{downloadedCount} songs</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">To Download</span>
                            <span className="font-bold text-primary">{targetCount} songs</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                            <span className="text-gray-500">Selected Quality</span>
                            <span className="font-bold uppercase text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{preferredQuality}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Est. Required Space</span>
                            <span className="font-bold text-gray-900 dark:text-white">~{formattedEstimate}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-gray-500 mb-6 bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-xl">
                        <IoInformationCircleOutline size={18} className="shrink-0 mt-0.5" />
                        <span>Actual storage size may vary depending on song duration and stream compression available from provider.</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm(downloadMode);
                                onClose();
                            }}
                            disabled={targetCount === 0}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-primary hover:bg-red-600 text-white shadow-lg shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Download ({targetCount})
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
