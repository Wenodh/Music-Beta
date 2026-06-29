import { MediaItem } from '../audio-sdk/models';

export type DownloadStatus =
    | 'queued'
    | 'preparing'
    | 'downloading'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface DownloadTask {
    id: string; // mediaId
    mediaItem: MediaItem;
    status: DownloadStatus;
    progress: number; // 0 to 100
    downloadedBytes: number;
    totalBytes?: number;
    error?: string;
    retryCount: number;
    addedAt: number;
    completedAt?: number;
}

export interface DownloadPolicy {
    wifiOnly: boolean;
    maxConcurrentDownloads: number;
    storageLimitBytes: number; // e.g., 2GB
}

export interface StorageUsage {
    totalBytes: number;
    mediaBytes: number;
    cacheBytes: number;
    availableBytes?: number;
}
