import { DownloadTask, DownloadStatus, DownloadPolicy } from './types';
import { MediaItem } from '../audio-sdk/models';
import { providerRegistry } from '../audio-sdk/registry';
import { StorageService } from '../storage/StorageService';
import { eventBus } from '../events';

export class DownloadManager {
    private tasks: Map<string, DownloadTask> = new Map();
    private activeDownloads = 0;
    private policy: DownloadPolicy = {
        wifiOnly: false,
        maxConcurrentDownloads: 3,
        storageLimitBytes: 2 * 1024 * 1024 * 1024, // 2GB
    };

    constructor() {
        this.loadTasks();
    }

    private async loadTasks() {
        const downloads = await StorageService.getAllDownloads();
        for (const d of downloads) {
            this.tasks.set(d.id, {
                id: d.id,
                mediaItem: {
                    id: d.id,
                    provider: d.provider,
                    type: d.type as any,
                    title: d.title,
                    subtitle: d.subtitle,
                    artwork: [{ url: d.artworkUrl || '' }],
                    metadata: d.metadata,
                    playable: true,
                },
                status: 'completed',
                progress: 100,
                downloadedBytes: d.size,
                totalBytes: d.size,
                retryCount: 0,
                addedAt: d.downloadedAt,
                completedAt: d.downloadedAt,
            });
        }
    }

    async startDownload(mediaItem: MediaItem): Promise<void> {
        if (this.tasks.has(mediaItem.id)) {
            const task = this.tasks.get(mediaItem.id)!;
            if (task.status === 'completed') return;
            if (task.status === 'downloading' || task.status === 'queued') return;
        }

        const task: DownloadTask = {
            id: mediaItem.id,
            mediaItem,
            status: 'queued',
            progress: 0,
            downloadedBytes: 0,
            retryCount: 0,
            addedAt: Date.now(),
        };

        this.tasks.set(task.id, task);
        this.emitUpdate(task);
        this.processQueue();
    }

    async pauseDownload(id: string): Promise<void> {
        const task = this.tasks.get(id);
        if (task && (task.status === 'downloading' || task.status === 'queued')) {
            task.status = 'paused';
            this.emitUpdate(task);
            if (task.status === 'downloading') {
                this.activeDownloads--;
            }
            this.processQueue();
        }
    }

    async resumeDownload(id: string): Promise<void> {
        const task = this.tasks.get(id);
        if (task && (task.status === 'paused' || task.status === 'failed')) {
            task.status = 'queued';
            this.emitUpdate(task);
            this.processQueue();
        }
    }

    async cancelDownload(id: string): Promise<void> {
        const task = this.tasks.get(id);
        if (task) {
            if (task.status === 'downloading') {
                this.activeDownloads--;
            }
            task.status = 'cancelled';
            this.tasks.delete(id);
            this.emitUpdate(task);
            this.processQueue();
        }
    }

    async removeDownload(id: string): Promise<void> {
        await this.cancelDownload(id);
        await StorageService.removeDownload(id);
        this.tasks.delete(id);
        eventBus.emit('DOWNLOAD_REMOVED', { id });
    }

    private async processQueue() {
        if (this.activeDownloads >= this.policy.maxConcurrentDownloads) return;

        const nextTask = Array.from(this.tasks.values())
            .filter(t => t.status === 'queued')
            .sort((a, b) => a.addedAt - b.addedAt)[0];

        if (nextTask) {
            this.executeDownload(nextTask);
        }
    }

    private async executeDownload(task: DownloadTask) {
        this.activeDownloads++;
        task.status = 'downloading';
        this.emitUpdate(task);

        try {
            const provider = providerRegistry.getProvider(task.mediaItem.provider);
            if (!provider) throw new Error('Provider not found');

            let playableSource = await provider.getPlayableSource(task.mediaItem.id);

            const response = await fetch(playableSource.url);

            if (!response.ok) {
                if (response.status === 403 && task.retryCount < 3) {
                    // Try refreshing URL once
                    task.retryCount++;
                    playableSource = await provider.getPlayableSource(task.mediaItem.id);
                    const retryResponse = await fetch(playableSource.url);
                    if (!retryResponse.ok) throw new Error(`HTTP ${retryResponse.status}`);
                    await this.handleResponse(task, retryResponse);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } else {
                await this.handleResponse(task, response);
            }

        } catch (error: any) {
            console.error(`Download failed for ${task.id}:`, error);
            task.status = 'failed';
            task.error = error.message;
            this.activeDownloads--;
            this.emitUpdate(task);
            this.processQueue();
        }
    }

    private async handleResponse(task: DownloadTask, response: Response) {
        const reader = response.body?.getReader();
        const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
        task.totalBytes = totalBytes;

        if (!reader) throw new Error('Failed to get reader from response body');

        const chunks: Uint8Array[] = [];
        let downloadedBytes = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (task.status !== 'downloading') {
                reader.cancel();
                return;
            }

            chunks.push(value);
            downloadedBytes += value.length;
            task.downloadedBytes = downloadedBytes;
            task.progress = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;

            // Throttle updates
            if (downloadedBytes % (1024 * 100) === 0 || task.progress === 100) {
                this.emitUpdate(task);
            }
        }

        const mimeType = response.headers.get('content-type') || 'audio/mpeg';
        const blob = new Blob(chunks, { type: mimeType });

        // Validation
        if (blob.size === 0) {
            throw new Error('Downloaded file is empty');
        }

        if (!mimeType.startsWith('audio/') && !mimeType.startsWith('application/octet-stream')) {
            console.warn(`Unexpected MIME type: ${mimeType}`);
        }

        // Check storage quota
        const currentUsage = await StorageService.getStorageUsage();
        if (currentUsage + blob.size > this.policy.storageLimitBytes) {
            eventBus.emit('DOWNLOAD_ERROR', { id: task.id, message: 'Storage limit exceeded. Please free up space.' });
            throw new Error('Storage limit exceeded');
        }

        await StorageService.saveDownload(task, blob);

        task.status = 'completed';
        task.progress = 100;
        task.completedAt = Date.now();
        this.activeDownloads--;
        this.emitUpdate(task);
        this.processQueue();
    }

    private emitUpdate(task: DownloadTask) {
        eventBus.emit('DOWNLOAD_PROGRESS', { ...task });
    }

    getTasks(): DownloadTask[] {
        return Array.from(this.tasks.values());
    }

    setPolicy(policy: Partial<DownloadPolicy>) {
        this.policy = { ...this.policy, ...policy };
    }
}

export const downloadManager = new DownloadManager();
