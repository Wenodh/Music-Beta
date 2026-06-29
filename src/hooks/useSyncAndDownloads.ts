import { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { eventBus, Events } from '../lib/events';
import { setFavoriteItems, updateSyncStatus } from '../features/library/librarySlice';
import { addDownloadedId, removeDownloadedId } from '../features/library/librarySlice';
import { addToHistory } from '../features/musicplayer/musicPlayerSlice';
import { downloadManager } from '../lib/downloads/DownloadManager';
import { RootState } from '../store';
import { showToast } from '../features/ui/uiSlice';
import { syncManager } from '../lib/sync/SyncManager';

export const useSyncAndDownloads = () => {
    const dispatch = useDispatch();

    const { favoriteItems } = useSelector((state: RootState) => state.library);
    const { history, currentSong } = useSelector((state: RootState) => state.musicPlayer);
    const lastPromptedIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Sync Events
        const handleSyncState = (state: any) => {
            dispatch(updateSyncStatus({
                status: state.status,
                pendingCount: state.pendingOperationsCount,
                lastSynced: state.lastSyncedAt
            }));
        };

        const handleSyncData = (event: { type: string, data: any[] }) => {
            console.log(`Sync data received for ${event.type}:`, event.data);

            switch (event.type) {
                case 'favorite': {
                    const cloudFavorites = event.data
                        .filter(f => !f.deleted_at)
                        .map(f => ({
                            id: f.id,
                            media: f.metadata,
                            provider: f.provider,
                            contentType: f.content_type,
                            createdAt: new Date(f.created_at).getTime(),
                            sync: {
                                uuid: f.id,
                                version: f.version,
                                updatedAt: f.updated_at,
                                deviceId: f.device_id
                            }
                        }));

                    // Merge Strategy: Union
                    // We combine cloud favorites with local favorites that haven't been synced yet
                    const localOnly = favoriteItems.filter(l => !l.sync && !cloudFavorites.find(c => c.media.id === l.media.id));
                    dispatch(setFavoriteItems([...cloudFavorites, ...localOnly]));
                    break;
                }
                case 'history': {
                    // Merge Strategy: Append & Deduplicate by session window (30m)
                    event.data.forEach(h => {
                        const playedAt = new Date(h.played_at).getTime();
                        const isDuplicate = history.some(l =>
                            l.mediaItem.id === h.media_id &&
                            Math.abs(new Date(l.playedAt).getTime() - playedAt) < 30 * 60 * 1000
                        );

                        if (!isDuplicate) {
                            dispatch(addToHistory({
                                id: h.media_id,
                                media: h.metadata,
                                playedAt: h.played_at,
                                listenedDuration: h.listened_duration,
                                sync: {
                                    uuid: h.id,
                                    version: h.version,
                                    updatedAt: h.updated_at,
                                    deviceId: h.device_id
                                }
                            }));
                        }
                    });
                    break;
                }
                case 'playback_position': {
                    if (!currentSong) return;

                    const remote = event.data.find(p => p.media_id === currentSong.id);
                    if (remote && remote.media_id !== lastPromptedIdRef.current) {
                        const localPosition = playbackManager._activeAudioElement?.currentTime || 0;
                        const localDuration = playbackManager._activeAudioElement?.duration || currentSong.duration || 1;

                        const diffSeconds = remote.position - localPosition;
                        const diffPercent = (diffSeconds / Number(localDuration)) * 100;

                        // Rule: > 2 minutes ahead OR > 5% further
                        const significantlyFurther = diffSeconds > 120 || diffPercent > 5;
                        const isNewer = new Date(remote.updated_at) > new Date(Date.now() - 5000); // Buffer for clock skew

                        if (significantlyFurther && isNewer) {
                            lastPromptedIdRef.current = remote.media_id;
                            dispatch(showToast({
                                message: `Continue ${currentSong.name} from ${Math.floor(remote.position / 60)}:${String(Math.floor(remote.position % 60)).padStart(2, '0')}?`,
                                type: 'info',
                                action: {
                                    label: 'Resume',
                                    onClick: () => playbackManager.seek(remote.position)
                                },
                                duration: 10000
                            }));
                        }
                    }
                    break;
                }
            }
        };

        // Download Events
        const handleDownloadProgress = (task: any) => {
            if (task.status === 'completed') {
                dispatch(addDownloadedId(task.id));
            }
        };

        const handleDownloadRemoved = (event: { id: string }) => {
            dispatch(removeDownloadedId(event.id));
        };

        eventBus.on('SYNC_STATE_CHANGED', handleSyncState);
        eventBus.on('SYNC_DATA_RECEIVED', handleSyncData);
        const handleDownloadError = (event: { id: string; message: string }) => {
            dispatch(showToast({ message: event.message, type: 'error' }));
        };

        eventBus.on('DOWNLOAD_PROGRESS', handleDownloadProgress);
        eventBus.on('DOWNLOAD_REMOVED', handleDownloadRemoved);
        eventBus.on('DOWNLOAD_ERROR', handleDownloadError);

        return () => {
            eventBus.off('SYNC_STATE_CHANGED', handleSyncState);
            eventBus.off('SYNC_DATA_RECEIVED', handleSyncData);
            eventBus.off('DOWNLOAD_PROGRESS', handleDownloadProgress);
            eventBus.off('DOWNLOAD_REMOVED', handleDownloadRemoved);
            eventBus.off('DOWNLOAD_ERROR', handleDownloadError);
        };
    }, [dispatch]);

    return {
        download: (mediaItem: any) => downloadManager.startDownload(mediaItem),
        sync: () => syncManager.sync(),
    };
};
