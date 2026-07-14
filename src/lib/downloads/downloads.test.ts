import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { MediaItem } from '../audio-sdk/models';

// Mock StorageService
vi.mock('../storage/StorageService', () => ({
    StorageService: {
        getAllDownloads: vi.fn().mockResolvedValue([]),
        saveDownload: vi.fn().mockResolvedValue(undefined),
        removeDownload: vi.fn().mockResolvedValue(undefined),
        getStorageUsage: vi.fn().mockResolvedValue(0)
    }
}));

// Mock Provider Registry
vi.mock('../audio-sdk/registry', () => ({
    providerRegistry: {
        getProvider: vi.fn().mockReturnValue({
            getPlayableSource: vi.fn().mockResolvedValue({ url: 'http://test.mp3' })
        })
    }
}));

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Map([['content-length', '1024'], ['content-type', 'audio/mpeg']]),
    body: {
        getReader: () => ({
            read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array(512) })
                .mockResolvedValueOnce({ done: true })
        })
    }
});

describe('DownloadManager', () => {
    let manager: DownloadManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new DownloadManager(); // Test fresh instance
    });

    it('should queue a download task', async () => {
        const mockItem: MediaItem = {
            id: 'dl-1',
            title: 'Download Track',
            provider: 'test',
            type: 'song',
            artwork: [],
            playable: true,
            metadata: {}
        } as any;

        // Prevent immediate execution for this test by mocking processQueue or similar
        // Or just check that it was added.
        // Since executeDownload is async, we can check status before it fails/completes
        manager.startDownload(mockItem);
        const tasks = manager.getTasks();
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('dl-1');
        // It might be 'downloading' immediately if processQueue runs
        expect(['queued', 'downloading']).toContain(tasks[0].status);
    });
});
