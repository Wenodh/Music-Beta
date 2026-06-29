import React, { useState, useEffect } from 'react';
import { DownloadTask } from '../../lib/downloads/types';
import { downloadManager } from '../../lib/downloads/DownloadManager';
import { eventBus } from '../../lib/events';
import { IoCloudDownloadOutline, IoCloseOutline, IoPlayOutline, IoPauseOutline, IoTrashOutline, IoAlertCircleOutline } from 'react-icons/io5';

export const DownloadsList: React.FC = () => {
    const [tasks, setTasks] = useState<DownloadTask[]>([]);

    useEffect(() => {
        setTasks(downloadManager.getTasks());

        const handleUpdate = () => {
            setTasks(downloadManager.getTasks());
        };

        eventBus.on('DOWNLOAD_PROGRESS', handleUpdate);
        return () => eventBus.off('DOWNLOAD_PROGRESS', handleUpdate);
    }, []);

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-secondary-text">
                <IoCloudDownloadOutline className="w-16 h-16 mb-4 opacity-20" />
                <p>No downloads yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {tasks.sort((a, b) => b.addedAt - a.addedAt).map(task => (
                <div key={task.id} className="bg-secondary-bg/50 p-4 rounded-xl flex items-center gap-4">
                    <img
                        src={task.mediaItem.artwork[0]?.url || '/placeholder.png'}
                        alt={task.mediaItem.title}
                        className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{task.mediaItem.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-secondary-text capitalize">{task.status}</span>
                            {task.status === 'downloading' && (
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-300"
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>
                            )}
                            {task.status === 'failed' && (
                                <IoAlertCircleOutline className="w-4 h-4 text-red-500" />
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {task.status === 'downloading' ? (
                            <button onClick={() => downloadManager.pauseDownload(task.id)} className="p-2 hover:bg-white/10 rounded-full">
                                <IoPauseOutline className="w-5 h-5" />
                            </button>
                        ) : (task.status === 'paused' || task.status === 'failed') ? (
                            <button onClick={() => downloadManager.resumeDownload(task.id)} className="p-2 hover:bg-white/10 rounded-full">
                                <IoPlayOutline className="w-5 h-5" />
                            </button>
                        ) : null}
                        <button onClick={() => downloadManager.removeDownload(task.id)} className="p-2 hover:bg-white/10 rounded-full text-red-400">
                            <IoTrashOutline className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
