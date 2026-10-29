import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadManagerService } from './downloadManager';
import { Song } from '../types/music';

// Mock localStorage for Node testing environment
const localStorageMap: Record<string, string> = {};
global.localStorage = {
    getItem: (key: string) => localStorageMap[key] || null,
    setItem: (key: string, value: string) => { localStorageMap[key] = value; },
    removeItem: (key: string) => { delete localStorageMap[key]; },
    clear: () => { Object.keys(localStorageMap).forEach(k => delete localStorageMap[k]); },
    key: (i: number) => Object.keys(localStorageMap)[i] || null,
    length: 0,
} as Storage;

// Mock db module
vi.mock('../utils/db', () => ({
    saveSongOffline: vi.fn().mockResolvedValue(undefined),
    getDownloadedSongIds: vi.fn().mockResolvedValue([]),
    deleteOfflineSong: vi.fn().mockResolvedValue(undefined),
    getOfflineSongs: vi.fn().mockResolvedValue([]),
    getDownloadStorageInfo: vi.fn().mockResolvedValue({ count: 0, totalSize: 0 }),
}));

// Mock imageUtils
vi.mock('../utils/imageUtils', () => ({
    extractImageUrl: vi.fn((song) => typeof song.image === 'string' ? song.image : 'https://example.com/cover.jpg'),
}));

const sampleSong1: Song = {
    id: 'song-1',
    name: 'Test Song 1',
    primaryArtists: 'Artist 1',
    duration: 200,
    image: 'https://example.com/cover1.jpg',
    downloadUrl: [
        { quality: '12kbps', url: 'https://example.com/audio1-12.mp3' },
        { quality: '160kbps', url: 'https://example.com/audio1-160.mp3' },
        { quality: '320kbps', url: 'https://example.com/audio1-320.mp3' },
    ],
};

const sampleSong2: Song = {
    id: 'song-2',
    name: 'Test Song 2',
    primaryArtists: 'Artist 2',
    duration: 180,
    image: 'https://example.com/cover2.jpg',
    downloadUrl: 'https://example.com/audio2.mp3',
};

const sampleSong3: Song = {
    id: 'song-3',
    name: 'Test Song 3',
    primaryArtists: 'Artist 3',
    duration: 220,
    image: 'https://example.com/cover3.jpg',
    downloadUrl: [
        { quality: '96kbps', url: 'https://example.com/audio3-96.mp3' },
    ],
};

describe('DownloadManagerService', () => {
    let manager: DownloadManagerService;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        manager = new DownloadManagerService();
    });

    afterEach(() => {
        manager.cancelQueue();
    });

    describe('resolveAudioUrl', () => {
        it('resolves exact match for preferred quality when available', () => {
            const resolved = manager.resolveAudioUrl(sampleSong1, '320kbps');
            expect(resolved).toEqual({
                url: 'https://example.com/audio1-320.mp3',
                quality: '320kbps',
            });
        });

        it('falls back to closest quality if exact match is not available', () => {
            const resolved = manager.resolveAudioUrl(sampleSong3, '320kbps');
            expect(resolved).toEqual({
                url: 'https://example.com/audio3-96.mp3',
                quality: '96kbps',
            });
        });

        it('supports single string downloadUrl', () => {
            const resolved = manager.resolveAudioUrl(sampleSong2, '160kbps');
            expect(resolved).toEqual({
                url: 'https://example.com/audio2.mp3',
                quality: '160kbps',
            });
        });

        it('returns null when no valid audio URL is present', () => {
            const invalidSong: Song = {
                id: 'inv',
                name: 'Invalid',
                primaryArtists: 'None',
                duration: 0,
                image: '',
                downloadUrl: '',
            };
            const resolved = manager.resolveAudioUrl(invalidSong, '320kbps');
            expect(resolved).toBeNull();
        });
    });

    describe('Enqueueing and Deduplication', () => {
        it('enqueues a song and calculates summary', async () => {
            global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

            const added = await manager.enqueueSong(sampleSong1);
            expect(added).toBe(true);

            const jobs = manager.getJobs();
            expect(jobs.length).toBe(1);
            expect(jobs[0].id).toBe('song-1');

            const summary = manager.getSummary();
            expect(summary.total).toBe(1);
        });

        it('prevents duplicate enqueueing for same song ID', async () => {
            global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

            const added1 = await manager.enqueueSong(sampleSong1);
            const added2 = await manager.enqueueSong(sampleSong1);

            expect(added1).toBe(true);
            expect(added2).toBe(false);
            expect(manager.getJobs().length).toBe(1);
        });

        it('bulk enqueues songs and skips existing', async () => {
            global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

            await manager.enqueueSong(sampleSong1);

            const res = await manager.enqueueSongs([sampleSong1, sampleSong2, sampleSong3]);
            expect(res.added).toBe(2);
            expect(res.skipped).toBe(1);
            expect(manager.getJobs().length).toBe(3);
        });
    });

    describe('Cancellation & Queue Controls', () => {
        it('cancels individual job correctly', async () => {
            global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

            await manager.enqueueSong(sampleSong1);
            await manager.enqueueSong(sampleSong2);

            expect(manager.getJobs().length).toBe(2);

            manager.cancelJob('song-1');
            expect(manager.getJobs().length).toBe(1);
            expect(manager.getJob('song-1')).toBeUndefined();
            expect(manager.getJob('song-2')).toBeDefined();
        });

        it('cancels all queued/active jobs on cancelQueue', async () => {
            global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

            await manager.enqueueSong(sampleSong1);
            await manager.enqueueSong(sampleSong2);

            manager.cancelQueue();
            expect(manager.getJobs().length).toBe(0);
        });
    });

    describe('Wi-Fi Restrictions & Pausing', () => {
        it('pauses queued jobs when Wi-Fi only is enabled and connection is cellular/offline', async () => {
            // Mock offline connection
            Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

            manager.setWifiOnly(true);
            await manager.enqueueSong(sampleSong1);

            const summary = manager.getSummary();
            expect(summary.isPausedForWifi).toBe(true);

            const job = manager.getJob('song-1');
            expect(job?.status).toBe('paused');
            expect(job?.error).toContain('Waiting for Wi-Fi');
        });
    });

    describe('Event Listeners & Subscriptions', () => {
        it('notifies listeners when queue state changes', async () => {
            global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

            const listener = vi.fn();
            const unsubscribe = manager.subscribe(listener);

            expect(listener).toHaveBeenCalledTimes(1);

            await manager.enqueueSong(sampleSong1);
            expect(listener).toHaveBeenCalled();

            unsubscribe();
        });
    });
});
