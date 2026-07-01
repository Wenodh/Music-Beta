import { eventBus } from '../events';
import { creatorStorage } from './StorageService';

export interface UploadProgress {
    jobId: string;
    progress: number;
    total: number;
    status: 'uploading' | 'completed' | 'error';
}

export class MediaUploadService {
    private static instance: MediaUploadService;

    private constructor() {}

    public static getInstance(): MediaUploadService {
        if (!MediaUploadService.instance) {
            MediaUploadService.instance = new MediaUploadService();
        }
        return MediaUploadService.instance;
    }

    async uploadWithProgress(organizationId: string, type: string, file: File) {
        const jobId = crypto.randomUUID();

        // Simple mock for chunked/resumable upload logic
        // In Supabase, standard upload doesn't report progress easily without custom logic
        // but we can simulate the progress events for the UI.

        eventBus.emit('UPLOAD_PROGRESS', { jobId, progress: 0, total: file.size, status: 'uploading' });

        try {
            const path = await creatorStorage.uploadAsset(organizationId, type, file);
            eventBus.emit('UPLOAD_PROGRESS', { jobId, progress: file.size, total: file.size, status: 'completed' });
            return path;
        } catch (e) {
            eventBus.emit('UPLOAD_PROGRESS', { jobId, progress: 0, total: file.size, status: 'error' });
            throw e;
        }
    }
}

export const mediaUploadService = MediaUploadService.getInstance();
