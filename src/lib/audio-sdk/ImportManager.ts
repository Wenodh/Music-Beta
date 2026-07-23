import { eventBus } from '../events';
import { syncManager } from '../sync/SyncManager';
import { audioSDK } from '../audio-sdk';
import { MediaItem } from '../audio-sdk/models';

export interface ImportJob {
    id: string;
    type: 'playlist' | 'opml' | 'rss';
    source: string; // URL or provider ID
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    total: number;
    error?: string;
}

export class ImportManager {
    private static instance: ImportManager;
    private activeJobs: Map<string, ImportJob> = new Map();

    private constructor() {
        this.setupListeners();
    }

    public static getInstance(): ImportManager {
        if (!ImportManager.instance) {
            ImportManager.instance = new ImportManager();
        }
        return ImportManager.instance;
    }

    private setupListeners() {
        // Listen for sync completion to resume imports if needed
        eventBus.on('SYNC_STATE_CHANGED', (state) => {
            if (state.status === 'synced') {
                this.resumePendingJobs();
            }
        });
    }

    public async startImport(type: ImportJob['type'], source: string) {
        const id = crypto.randomUUID();
        const job: ImportJob = {
            id,
            type,
            source,
            status: 'pending',
            progress: 0,
            total: 0
        };

        this.activeJobs.set(id, job);
        this.notifyProgress(job);

        // Enqueue in SyncManager for persistence and background processing
        await syncManager.enqueue('playlist_op', 'apply', {
            type: 'import_start',
            jobId: id,
            importType: type,
            source
        });

        this.processJob(id);
        return id;
    }

    private async processJob(id: string) {
        const job = this.activeJobs.get(id);
        if (!job) return;

        job.status = 'running';
        this.notifyProgress(job);

        try {
            if (job.type === 'playlist') {
                await this.importPlaylist(job);
            }
            // Add other types...

            job.status = 'completed';
            job.progress = job.total;
        } catch (e: any) {
            job.status = 'failed';
            job.error = e.message;
        }

        this.notifyProgress(job);

        await syncManager.enqueue('playlist_op', 'apply', {
            type: 'import_status',
            jobId: id,
            status: job.status,
            error: job.error
        });
    }

    private async importPlaylist(job: ImportJob) {
        // Mock implementation of playlist import
        // In a real scenario, this would call the provider API to get items
        job.total = 100; // Example
        for (let i = 0; i < job.total; i++) {
            // Simulate processing
            job.progress = i + 1;
            if (i % 10 === 0) {
                this.notifyProgress(job);
                // Heartbeat to sync manager
            }
            await new Promise(r => setTimeout(r, 50));
        }
    }

    private notifyProgress(job: ImportJob) {
        eventBus.emit('IMPORT_PROGRESS', job);
    }

    private async resumePendingJobs() {
        // Fetch pending jobs from sync queue or storage and restart
    }
}

export const importManager = ImportManager.getInstance();
