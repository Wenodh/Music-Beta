import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose, IoCloudDownloadOutline, IoRefresh, IoTrash, IoPause, IoPlay,
    IoCheckmarkCircle, IoAlertCircle, IoTimeOutline, IoHardwareChipOutline,
    IoWifiOutline
} from 'react-icons/io5';
import { downloadManager, DownloadJob, DownloadSummary } from '../../services/downloadManager';
import { extractImageUrl } from '../../utils/imageUtils';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { removeDownloadedId, setDownloadedIds } from '../../features/library/librarySlice';
import { setWifiOnly } from '../../features/musicplayer/musicPlayerSlice';
import { deleteAllDownloads } from '../../utils/db';
import { showToast } from '../../features/ui/uiSlice';

interface DownloadManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DownloadManagerModal: React.FC<DownloadManagerModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const { downloadSettings } = useAppSelector(state => state.musicPlayer);
    const wifiOnly = downloadSettings?.wifiOnly ?? false;

    const [jobs, setJobs] = useState<DownloadJob[]>([]);
    const [summary, setSummary] = useState<DownloadSummary>({
        total: 0,
        completed: 0,
        failed: 0,
        downloading: 0,
        waiting: 0,
        paused: 0,
        isPausedForWifi: false,
        totalBytesDownloaded: 0,
    });

    const [activeTab, setActiveTab] = useState<'queue' | 'completed' | 'storage'>('queue');

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = downloadManager.subscribe((updatedJobs, updatedSummary) => {
            setJobs([...updatedJobs]);
            setSummary({ ...updatedSummary });
        });

        return () => unsubscribe();
    }, [isOpen]);

    if (!isOpen) return null;

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleRetryJob = (songId: string) => {
        downloadManager.retryJob(songId);
    };

    const handleCancelJob = (songId: string) => {
        downloadManager.cancelJob(songId);
    };

    const handleRemoveDownloaded = async (songId: string) => {
        await downloadManager.removeDownloadedSong(songId);
        dispatch(removeDownloadedId(songId));
        dispatch(showToast({ message: 'Removed from local downloads' }));
    };

    const handleClearAll = async () => {
        if (window.confirm('Delete all local downloaded songs? This will NOT remove your favorites from Supabase.')) {
            await deleteAllDownloads();
            dispatch(setDownloadedIds([]));
            downloadManager.cancelQueue();
            dispatch(showToast({ message: 'All downloads deleted' }));
        }
    };

    const queuedJobs = jobs.filter(j => j.status !== 'completed');
    const completedJobs = jobs.filter(j => j.status === 'completed');

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                                <IoCloudDownloadOutline size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold">Download Manager</h2>
                                <p className="text-xs text-gray-500">
                                    {summary.downloading > 0
                                        ? `Downloading ${summary.downloading} item(s)...`
                                        : `${summary.total} total managed item(s)`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors"
                        >
                            <IoClose size={22} />
                        </button>
                    </div>

                    {/* Wi-Fi Alert Banner if paused for Wi-Fi */}
                    {summary.isPausedForWifi && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                            <div className="flex items-center gap-2 min-w-0">
                                <IoWifiOutline size={18} className="shrink-0" />
                                <span className="truncate">Downloads paused: Waiting for Wi-Fi connection.</span>
                            </div>
                            <button
                                onClick={() => dispatch(setWifiOnly(false))}
                                className="ml-2 font-bold underline shrink-0 hover:text-amber-700 dark:hover:text-amber-300"
                            >
                                Download Anyway
                            </button>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-800 px-4 pt-2 gap-2 text-xs font-bold">
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`py-3 px-4 rounded-xl transition-all relative ${
                                activeTab === 'queue'
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Queue ({queuedJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`py-3 px-4 rounded-xl transition-all relative ${
                                activeTab === 'completed'
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Completed ({completedJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('storage')}
                            className={`py-3 px-4 rounded-xl transition-all relative ${
                                activeTab === 'storage'
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Storage Usage
                        </button>
                    </div>

                    {/* Tab Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                        {activeTab === 'queue' && (
                            <>
                                {queuedJobs.length > 0 && (
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                                        <div className="text-xs text-gray-500">
                                            {summary.waiting} waiting, {summary.failed} failed
                                        </div>
                                        <div className="flex gap-2">
                                            {summary.failed > 0 && (
                                                <button
                                                    onClick={() => downloadManager.retryFailed()}
                                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <IoRefresh size={14} /> Retry Failed
                                                </button>
                                            )}
                                            <button
                                                onClick={() => downloadManager.cancelQueue()}
                                                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Cancel Queue
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {queuedJobs.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400 space-y-2">
                                        <IoCheckmarkCircle size={48} className="mx-auto opacity-20 text-primary" />
                                        <p className="font-semibold text-sm">No downloads in queue</p>
                                        <p className="text-xs opacity-60">Your downloaded songs are ready for offline playback.</p>
                                    </div>
                                ) : (
                                    queuedJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3"
                                        >
                                            <img
                                                src={extractImageUrl(job.song as any)}
                                                alt=""
                                                className="w-12 h-12 rounded-xl object-cover shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2 mb-1">
                                                    <p className="font-bold text-sm truncate">{job.song.name}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                        job.status === 'downloading'
                                                            ? 'bg-blue-500/10 text-blue-500 animate-pulse'
                                                            : job.status === 'failed'
                                                            ? 'bg-red-500/10 text-red-500'
                                                            : job.status === 'paused'
                                                            ? 'bg-amber-500/10 text-amber-500'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                    }`}>
                                                        {job.status === 'downloading' ? `${job.progress}%` : job.status}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-gray-500 truncate mb-1.5">{job.song.primaryArtists}</p>

                                                {/* Progress bar */}
                                                {job.status === 'downloading' && (
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-primary h-full transition-all duration-300"
                                                            style={{ width: `${job.progress}%` }}
                                                        />
                                                    </div>
                                                )}

                                                {job.error && (
                                                    <p className="text-[10px] text-red-500 truncate mt-1">{job.error}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {job.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleRetryJob(job.id)}
                                                        className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors"
                                                        title="Retry"
                                                    >
                                                        <IoRefresh size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleCancelJob(job.id)}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                                    title="Cancel"
                                                >
                                                    <IoClose size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === 'completed' && (
                            <>
                                {completedJobs.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400 space-y-2">
                                        <IoCloudDownloadOutline size={48} className="mx-auto opacity-20" />
                                        <p className="font-semibold text-sm">No completed downloads</p>
                                    </div>
                                ) : (
                                    completedJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3"
                                        >
                                            <img
                                                src={extractImageUrl(job.song as any)}
                                                alt=""
                                                className="w-12 h-12 rounded-xl object-cover shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{job.song.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{job.song.primaryArtists}</p>
                                                <p className="text-[10px] text-green-500 font-bold mt-0.5">
                                                    Downloaded ({job.qualityUsed || '320kbps'})
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveDownloaded(job.id)}
                                                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-full transition-colors shrink-0"
                                                title="Remove download"
                                            >
                                                <IoTrash size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {activeTab === 'storage' && (
                            <div className="space-y-6 py-2">
                                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                                    <div className="flex items-center gap-3 text-primary">
                                        <IoHardwareChipOutline size={28} />
                                        <div>
                                            <h3 className="font-bold text-base">Offline Local Storage</h3>
                                            <p className="text-xs text-gray-500">Stored persistently on device in IndexedDB</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                        <div>
                                            <p className="text-xs text-gray-500">Downloaded Songs</p>
                                            <p className="text-2xl font-extrabold">{summary.completed} items</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Total Disk Space</p>
                                            <p className="text-2xl font-extrabold text-primary">{formatBytes(summary.totalBytesDownloaded)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        Deleting local downloads frees up storage space on your device. This will <strong className="text-red-500">NOT</strong> delete your favorite song records from your account or cloud library.
                                    </p>
                                    <button
                                        onClick={handleClearAll}
                                        disabled={summary.completed === 0 && queuedJobs.length === 0}
                                        className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                    >
                                        <IoTrash size={18} /> Remove All Local Downloads
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
