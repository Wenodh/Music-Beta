import React, { useState, useEffect, useMemo } from 'react';
import {
    IoCall,
    IoVideocam,
    IoTrashOutline,
    IoArrowDown,
    IoArrowUp,
    IoCloseCircle,
    IoTimeOutline,
    IoCheckmarkCircle,
    IoRefreshOutline,
    IoBanOutline,
} from 'react-icons/io5';
import {
    CallLogEntry,
    getCallHistoryLocal,
    deleteCallLogLocal,
    clearCallHistoryLocal,
    blockUserLocal,
    CallOutcome,
    CallDirection,
} from '../../../utils/friendsDb';
import { socialService } from '../../../services/socialService';
import { useDirectCommunication } from '../../../hooks/useDirectCommunication';
import { useAppDispatch } from '../../../hooks/redux';
import { showToast } from '../../ui/uiSlice';

type FilterType = 'all' | 'missed' | 'incoming' | 'outgoing';

export const formatCallDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

export const formatCallTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
};

export const getOutcomeBadge = (outcome: CallOutcome, direction: CallDirection) => {
    switch (outcome) {
        case 'connected':
            return {
                label: 'Connected',
                color: 'text-green-400 bg-green-500/10 border-green-500/20',
                icon: <IoCheckmarkCircle size={12} className="text-green-400" />,
            };
        case 'missed':
            return {
                label: direction === 'incoming' ? 'Missed Call' : 'Unanswered',
                color: 'text-red-400 bg-red-500/10 border-red-500/20',
                icon: <IoCloseCircle size={12} className="text-red-400" />,
            };
        case 'declined':
            return {
                label: 'Declined',
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                icon: <IoCloseCircle size={12} className="text-amber-400" />,
            };
        case 'busy':
            return {
                label: 'User Busy',
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                icon: <IoTimeOutline size={12} className="text-amber-400" />,
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                icon: <IoCloseCircle size={12} className="text-gray-400" />,
            };
        default:
            return {
                label: outcome,
                color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                icon: <IoTimeOutline size={12} />,
            };
    }
};

export const CallHistoryTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const { callFriend } = useDirectCommunication();

    const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const logs = await getCallHistoryLocal();
            // Prevent duplicate records with identical callId
            const uniqueLogs: CallLogEntry[] = [];
            const seenIds = new Set<string>();
            for (const log of logs) {
                const uniqueKey = log.callId || log.id;
                if (!seenIds.has(uniqueKey)) {
                    seenIds.add(uniqueKey);
                    uniqueLogs.push(log);
                }
            }
            setCallLogs(uniqueLogs);
        } catch (err) {
            console.warn('Failed to load call history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const filteredLogs = useMemo(() => {
        return callLogs.filter((log) => {
            if (filter === 'all') return true;
            if (filter === 'missed') return log.outcome === 'missed' || log.outcome === 'declined';
            if (filter === 'incoming') return log.direction === 'incoming';
            if (filter === 'outgoing') return log.direction === 'outgoing';
            return true;
        });
    }, [callLogs, filter]);

    const handleCallback = (log: CallLogEntry) => {
        callFriend(
            {
                id: log.peerId,
                name: log.peerName,
                addedAt: Date.now(),
            },
            log.callType || 'audio'
        );
    };

    const handleDeleteLog = async (e: React.MouseEvent, logId: string) => {
        e.stopPropagation();
        if (!window.confirm('Delete this call record from this device?')) return;

        try {
            const selectedLog = callLogs.find((item) => item.id === logId);
            const duplicateIds = callLogs
                .filter((item) => selectedLog?.callId ? item.callId === selectedLog.callId : item.id === logId)
                .map((item) => item.id);
            await Promise.all(duplicateIds.map((id) => deleteCallLogLocal(id)));
            setCallLogs((prev) => prev.filter((item) => !duplicateIds.includes(item.id)));
            dispatch(showToast({ message: 'Call log removed from this device' }));
        } catch (error) {
            console.warn('Failed to delete call log:', error);
            dispatch(showToast({ message: 'Unable to delete call log', type: 'error' }));
        }
    };

    const handleClearAll = async () => {
        try {
            await clearCallHistoryLocal();
            setCallLogs([]);
            setShowConfirmClear(false);
            dispatch(showToast({ message: 'Call history cleared from this device' }));
        } catch (error) {
            console.warn('Failed to clear call history:', error);
            dispatch(showToast({ message: 'Unable to clear call history', type: 'error' }));
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black/20">
            {/* Header controls & filter pills */}
            <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/5 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                    {(['all', 'missed', 'incoming', 'outgoing'] as FilterType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                                filter === tab
                                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="hidden sm:inline text-[9px] text-gray-500">Stored on this device</span>
                    <button
                        onClick={loadHistory}
                        className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                        title="Refresh Call History"
                        aria-label="Refresh Call History"
                    >
                        <IoRefreshOutline size={16} />
                    </button>
                    {callLogs.length > 0 && (
                        <button
                            onClick={() => setShowConfirmClear(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Clear all call history"
                        >
                            <IoTrashOutline size={14} />
                            <span className="hidden xs:inline">Clear All</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Clear confirmation modal overlay */}
            {showConfirmClear && (
                <div className="p-3 bg-red-950/60 border-b border-red-500/20 flex items-center justify-between gap-3 text-xs text-red-200">
                    <span>Clear all call history records?</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowConfirmClear(false)}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                        const badge = getOutcomeBadge(log.outcome, log.direction);
                        const isMissed = log.outcome === 'missed';

                        return (
                            <div
                                key={log.id}
                                onClick={() => handleCallback(log)}
                                className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Direction / Type icon bubble */}
                                    <div
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm shrink-0 border ${
                                            isMissed
                                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                : log.direction === 'incoming'
                                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                                : 'bg-primary/20 text-primary border-primary/30'
                                        }`}
                                    >
                                        {log.callType === 'video' ? (
                                            <IoVideocam size={18} />
                                        ) : log.direction === 'incoming' ? (
                                            <IoArrowDown size={18} />
                                        ) : (
                                            <IoArrowUp size={18} />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p
                                                className={`text-xs sm:text-sm font-bold truncate ${
                                                    isMissed ? 'text-red-400' : 'text-white'
                                                }`}
                                            >
                                                {log.peerName || 'Contact'}
                                            </p>
                                            <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${badge.color}`}
                                            >
                                                {badge.icon}
                                                <span>{badge.label}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                            <span>{formatCallTimestamp(log.startedAt)}</span>
                                            {log.outcome === 'connected' && log.durationSeconds > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{formatCallDuration(log.durationSeconds)}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span className="capitalize">{log.callType}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 pl-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCallback(log);
                                        }}
                                        className="p-2.5 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                                        title={`Call back (${log.callType})`}
                                        aria-label={`Call back ${log.peerName}`}
                                    >
                                        {log.callType === 'video' ? <IoVideocam size={15} /> : <IoCall size={15} />}
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Block ${log.peerName || 'this user'}? Future calls and messages from them will be dropped.`)) {
                                                await blockUserLocal(log.peerId, 'Blocked from call history');
                                                if (socialService.isValidUUID(log.peerId)) {
                                                    await socialService.blockUser(log.peerId).catch(() => {});
                                                }
                                                dispatch(showToast({ message: `Blocked ${log.peerName || 'user'}` }));
                                            }
                                        }}
                                        className="p-2 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors active:scale-95"
                                        title="Block caller"
                                        aria-label="Block caller"
                                    >
                                        <IoBanOutline size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteLog(e, log.id)}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors active:scale-95"
                                        title="Delete log"
                                        aria-label="Delete log entry"
                                    >
                                        <IoTrashOutline size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-500">
                        <div className="p-3 bg-white/5 rounded-2xl mb-3 text-gray-400">
                            <IoCall size={26} />
                        </div>
                        <p className="text-xs font-bold text-gray-300 mb-1">No Call History</p>
                        <p className="text-[11px] text-gray-500 max-w-[200px]">
                            {filter === 'all'
                                ? 'Your voice and video call logs will appear here.'
                                : `No ${filter} calls recorded.`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
