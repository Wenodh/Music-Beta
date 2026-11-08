import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadManager } from '../../services/downloadManager';
import * as db from '../../utils/db';
import { Song } from '../../types/music';

const mockSong: Song = {
    id: 'quota-test-song-1',
    name: 'Quota Test Track',
    title: 'Quota Test Track',
    artist: 'Tester',
    primaryArtists: 'Tester',
    year: '2026',
    duration: 180,
    label: 'Label',
    language: 'English',
    genre: 'Rock',
    image: [{ quality: '500x500', url: 'https://example.com/cover.jpg' }],
    downloadUrl: [{ quality: '320kbps', url: 'https://example.com/stream.mp3' }],
};

describe('Storage Quota Exhaustion & Download Manager Regression (VIBE-BUG-010)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Clear download queue
        (downloadManager as any).jobs = new Map();
        (downloadManager as any).activeControllers = new Map();
    });

    it('classifies QuotaExceededError as permanent failure and halts retries immediately', async () => {
        // Mock fetch for audio stream
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('stream.mp3')) {
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
                        controller.close();
                    },
                });
                return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-length': '4' } }));
            }
            return Promise.resolve(new Response(new Blob(['fake-img']), { status: 200 }));
        });

        // Mock saveSongOffline to reject with QuotaExceededError
        let callCount = 0;
        vi.spyOn(db, 'getDownloadedSongIds').mockResolvedValue([]);
        vi.spyOn(db, 'saveSongOffline').mockImplementation(async () => {
            callCount++;
            const quotaError = new Error('Storage quota exceeded. Please free up disk space to download more songs.');
            quotaError.name = 'QuotaExceededError';
            throw quotaError;
        });

        await downloadManager.enqueueSong(mockSong);

        // Allow queue execution to complete
        await new Promise((res) => setTimeout(res, 300));

        const job = downloadManager.getJob('quota-test-song-1');
        expect(job).toBeDefined();
        expect(job?.status).toBe('failed');
        expect(job?.error).toContain('Storage quota exceeded');
        // Must fail immediately on attempt 1 without executing 3 futile exponential backoff retries
        expect(callCount).toBe(1);
        expect(job?.retryCount).toBe(1);
    });
});
