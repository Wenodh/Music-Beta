import { db, DownloadEntry, SyncOperationEntry } from './db';
import { SyncOperation } from '../sync/types';
import { DownloadTask } from '../downloads/types';

export class StorageService {
    // Download Store
    static async saveDownload(task: DownloadTask, blob: Blob): Promise<void> {
        const entry: DownloadEntry = {
            id: task.id,
            provider: task.mediaItem.provider,
            type: task.mediaItem.type,
            title: task.mediaItem.title,
            subtitle: task.mediaItem.subtitle,
            artworkUrl: task.mediaItem.artwork[0]?.url,
            blob,
            mimeType: blob.type,
            size: blob.size,
            downloadedAt: Date.now(),
            metadata: task.mediaItem.metadata,
        };
        await db.downloads.put(entry);
    }

    static async getDownload(id: string): Promise<DownloadEntry | undefined> {
        return await db.downloads.get(id);
    }

    static async getAllDownloads(): Promise<DownloadEntry[]> {
        return await db.downloads.toArray();
    }

    static async removeDownload(id: string): Promise<void> {
        await db.downloads.delete(id);
    }

    static async getStorageUsage(): Promise<number> {
        const downloads = await db.downloads.toArray();
        return downloads.reduce((acc, curr) => acc + curr.size, 0);
    }

    // Sync Queue Store
    static async addSyncOperation(op: SyncOperation): Promise<void> {
        const entry: SyncOperationEntry = {
            id: op.id,
            type: op.type,
            action: op.action,
            payload: op.payload,
            createdAt: new Date(op.createdAt).getTime(),
            retryCount: op.retryCount,
        };
        await db.syncQueue.put(entry);
    }

    static async getPendingOperations(): Promise<SyncOperation[]> {
        const entries = await db.syncQueue.orderBy('createdAt').toArray();
        return entries.map(e => ({
            id: e.id,
            type: e.type as any,
            action: e.action as any,
            payload: e.payload,
            createdAt: new Date(e.createdAt).toISOString(),
            retryCount: e.retryCount,
            deviceId: '', // Should be filled by SyncManager
        }));
    }

    static async removeSyncOperation(id: string): Promise<void> {
        await db.syncQueue.delete(id);
    }

    static async updateSyncOperation(op: SyncOperation): Promise<void> {
        await db.syncQueue.update(op.id, {
            retryCount: op.retryCount,
        });
    }

    // Generic Key-Value Store
    static async setItem(key: string, value: any): Promise<void> {
        await db.keyValue.put({ key, value });
    }

    static async getItem<T>(key: string): Promise<T | undefined> {
        const entry = await db.keyValue.get(key);
        return entry?.value;
    }

    static async removeItem(key: string): Promise<void> {
        await db.keyValue.delete(key);
    }
}
