import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { MusicApiService } from '../musicApiService';

vi.mock('idb', () => ({
    openDB: vi.fn().mockRejectedValue(new Error('IndexedDB unavailable in unit test')),
}));

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        isCancel: (error: any) => error?.name === 'CanceledError',
    },
}));

const mockedGet = vi.mocked(axios.get);

const payload = (items: any[]) => ({ data: { results: items } });

describe('MusicApiService request coordination and cache behavior', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        localStorage.clear();
    });

    it('deduplicates concurrent requests for the same cache key', async () => {
        let resolveRequest: ((value: any) => void) | undefined;
        mockedGet.mockImplementation(() => new Promise(resolve => {
            resolveRequest = resolve;
        }) as any);

        const service = new MusicApiService();
        const first = service.fetchWithFallback('/api/search?q=shared');
        const second = service.fetchWithFallback('/api/search?q=shared');

        await vi.waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
        resolveRequest?.({ data: payload([{ id: 'song-1' }]) });

        const [firstResult, secondResult] = await Promise.all([first, second]);
        expect(firstResult.data).toEqual(secondResult.data);
        expect(service.getCacheStats().metrics.deduplicatedRequests).toBe(1);
        expect(service.getCacheStats().metrics.httpAttempts).toBe(1);
    });

    it('serves stale cache immediately and exposes the background refresh promise', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-25T10:00:00.000Z'));
        mockedGet
            .mockResolvedValueOnce({ data: payload([{ id: 'old-song' }]) } as any)
            .mockResolvedValueOnce({ data: payload([{ id: 'new-song' }]) } as any);

        const service = new MusicApiService();
        const first = await service.fetchWithFallback('/api/search?q=stale-test');
        expect(first.data.data.results[0].id).toBe('old-song');

        await vi.advanceTimersByTimeAsync(16 * 60 * 1000);
        const stale = await service.fetchWithFallback(
            '/api/search?q=stale-test',
            {},
            undefined,
            { staleWhileRevalidate: true }
        );

        expect(stale.isCached).toBe(true);
        expect(stale.data.data.results[0].id).toBe('old-song');
        expect(stale.refreshPromise).toBeDefined();

        const refreshed = await stale.refreshPromise;
        expect(refreshed?.data.data.results[0].id).toBe('new-song');
        expect(service.getCachedData<any>('/api/search?q=stale-test')?.data.results[0].id).toBe('new-song');
    });

    it('returns fresh cached data without making another HTTP request', async () => {
        mockedGet.mockResolvedValueOnce({ data: payload([{ id: 'cached-song' }]) } as any);
        const service = new MusicApiService();

        await service.fetchWithFallback('/api/search?q=fresh-test');
        const cached = await service.fetchWithFallback('/api/search?q=fresh-test');

        expect(cached.isCached).toBe(true);
        expect(mockedGet).toHaveBeenCalledTimes(1);
        expect(service.getCacheStats().metrics.cacheHits).toBe(1);
    });
});
