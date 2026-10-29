import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoBuild, IoCheckmarkCircle, IoAlertCircle, IoHelpCircle, IoRefresh, IoStop } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setFavorites } from '../../features/library/librarySlice';
import { showToast } from '../../features/ui/uiSlice';
import {
    isSongIncomplete,
    repairFavorites,
    RecoveryProgress,
    RecoveryReport,
} from '../../services/favoriteRecoveryService';

interface RepairFavoritesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RepairFavoritesModal: React.FC<RepairFavoritesModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const favorites = useAppSelector((state) => state.library.favorites);
    const user = useAppSelector((state) => state.auth.user);

    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'cancelled'>('idle');
    const [isForceMode, setIsForceMode] = useState(false);
    const [progress, setProgress] = useState<RecoveryProgress | null>(null);
    const [report, setReport] = useState<RecoveryReport | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const incompleteCount = favorites.filter(isSongIncomplete).length;

    useEffect(() => {
        if (!isOpen) {
            setStatus('idle');
            setIsForceMode(false);
            setProgress(null);
            setReport(null);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        }
    }, [isOpen]);

    const handleStartRepair = async (forceMode = false, retryFailedOnly = false) => {
        if (favorites.length === 0) return;

        setStatus('running');
        abortControllerRef.current = new AbortController();

        const currentFavorites = [...favorites];
        const updatedFavoritesMap = new Map(currentFavorites.map((s) => [s.id, s]));

        const songsToProcess = retryFailedOnly && report?.failedItems.length
            ? currentFavorites.filter((s) => report.failedItems.some((f) => f.songId === s.id))
            : currentFavorites;

        try {
            const finalReport = await repairFavorites(songsToProcess, user?.id, {
                concurrency: 5,
                maxRetries: 3,
                forceAll: forceMode,
                signal: abortControllerRef.current.signal,
                onProgress: (latestProgress) => {
                    setProgress(latestProgress);
                },
                onSongRepaired: (repairedSong) => {
                    updatedFavoritesMap.set(repairedSong.id, repairedSong);
                    dispatch(setFavorites(Array.from(updatedFavoritesMap.values())));
                },
            });

            setReport(finalReport);
            if (abortControllerRef.current?.signal.aborted || finalReport.isCancelled) {
                setStatus('cancelled');
            } else {
                setStatus('completed');
                if (finalReport.repaired > 0) {
                    dispatch(showToast({ message: `Successfully repaired ${finalReport.repaired} song${finalReport.repaired === 1 ? '' : 's'}.` }));
                } else if (finalReport.failed > 0) {
                    dispatch(showToast({ message: `${finalReport.failed} song(s) failed to repair. You can retry.` }));
                } else {
                    dispatch(showToast({ message: 'All favorites are up to date.' }));
                }
            }
        } catch (err) {
            console.error('Repair favorites error:', err);
            setStatus('completed');
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setStatus('cancelled');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                <IoBuild size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                    Repair Favorites Metadata
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Restore missing titles, artists, artwork, and streaming URLs
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={status === 'running'}
                            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="py-6 space-y-4">
                        {status === 'idle' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{favorites.length}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Favorites</p>
                                    </div>
                                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{incompleteCount}</p>
                                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Needs Repair</p>
                                    </div>
                                </div>

                                {favorites.length === 0 ? (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            You don't have any favorites to repair yet.
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Add songs to your favorites and return here if artwork or details ever appear missing.
                                        </p>
                                    </div>
                                ) : incompleteCount === 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 text-xs">
                                            <IoCheckmarkCircle size={20} className="shrink-0" />
                                            <span>All {favorites.length} favorites are up to date with complete metadata!</span>
                                        </div>

                                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-800 text-xs space-y-2">
                                            <label className="flex items-center gap-2 font-semibold cursor-pointer text-gray-800 dark:text-gray-200">
                                                <input
                                                    type="checkbox"
                                                    checked={isForceMode}
                                                    onChange={(e) => setIsForceMode(e.target.checked)}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                Force Recheck All Favorites
                                            </label>
                                            {isForceMode && (
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400 pl-6 leading-relaxed">
                                                    ⚠️ Warning: Force recheck will re-query the provider for all {favorites.length} favorite songs. This will make multiple network requests to verify artwork and playback links.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {incompleteCount} of your favorite songs are missing metadata (e.g. artwork, artist details, or audio URLs).
                                            Repairing will fetch details directly from JioSaavn and update your account.
                                        </p>
                                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-800 text-xs">
                                            <label className="flex items-center gap-2 font-medium cursor-pointer text-gray-700 dark:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={isForceMode}
                                                    onChange={(e) => setIsForceMode(e.target.checked)}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                Force Recheck All ({favorites.length} songs)
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {status === 'running' && progress && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-2 font-medium">
                                        <AiOutlineLoading3Quarters className="animate-spin text-primary" size={14} />
                                        Recovering metadata...
                                    </span>
                                    <span className="font-mono">
                                        {progress.repaired + progress.failed + progress.unavailable} / {isForceMode ? favorites.length : incompleteCount}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="bg-primary h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${Math.min(
                                                100,
                                                ((progress.repaired + progress.failed + progress.unavailable) / Math.max(1, isForceMode ? favorites.length : incompleteCount)) * 100
                                            )}%`,
                                        }}
                                        transition={{ ease: 'easeOut', duration: 0.2 }}
                                    />
                                </div>

                                {progress.currentSongName && (
                                    <p className="text-[11px] text-gray-400 truncate">
                                        Processing: <span className="text-gray-700 dark:text-gray-300 font-medium">{progress.currentSongName}</span>
                                    </p>
                                )}

                                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <p className="text-base font-bold">{progress.repaired}</p>
                                        <p className="text-[10px]">Repaired</p>
                                    </div>
                                    <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                                        <p className="text-base font-bold">{progress.unavailable}</p>
                                        <p className="text-[10px]">Unavailable</p>
                                    </div>
                                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                                        <p className="text-base font-bold">{progress.failed}</p>
                                        <p className="text-[10px]">Failed</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(status === 'completed' || status === 'cancelled') && report && (
                            <div className="space-y-4">
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
                                    <h4 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                                        {status === 'cancelled' ? 'Repair Cancelled' : 'Repair Summary'}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex justify-between p-1.5 rounded bg-white dark:bg-gray-900">
                                            <span className="text-gray-500">Examined:</span>
                                            <span className="font-semibold">{report.totalChecked}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5 rounded bg-white dark:bg-gray-900">
                                            <span className="text-gray-500">Already Complete:</span>
                                            <span className="font-semibold">{report.alreadyComplete}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5 rounded bg-white dark:bg-gray-900">
                                            <span className="text-emerald-600 font-medium">Repaired:</span>
                                            <span className="font-semibold text-emerald-600">{report.repaired}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5 rounded bg-white dark:bg-gray-900">
                                            <span className="text-rose-600 font-medium">Unavailable:</span>
                                            <span className="font-semibold text-rose-600">{report.unavailable}</span>
                                        </div>
                                    </div>
                                </div>

                                {report.failedItems.length > 0 && (
                                    <div className="p-3 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-500/20 text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IoAlertCircle size={18} className="shrink-0" />
                                            <span>{report.failedItems.length} songs failed due to temporary network errors.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        {status === 'idle' && (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {favorites.length === 0 ? 'Close' : 'Cancel'}
                                </button>
                                <button
                                    onClick={() => handleStartRepair(isForceMode, false)}
                                    disabled={favorites.length === 0 || (incompleteCount === 0 && !isForceMode)}
                                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <IoBuild size={14} />
                                    {isForceMode ? 'Force Recheck All' : 'Start Repair'}
                                </button>
                            </>
                        )}

                        {status === 'running' && (
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center gap-2"
                            >
                                <IoStop size={14} />
                                Stop Repair
                            </button>
                        )}

                        {(status === 'completed' || status === 'cancelled') && (
                            <>
                                {report && report.failedItems.some((f) => f.isRetryable) && (
                                    <button
                                        onClick={() => handleStartRepair(isForceMode, true)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-2"
                                    >
                                        <IoRefresh size={14} />
                                        Retry Failed
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
                                >
                                    Done
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
