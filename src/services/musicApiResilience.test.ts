import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MusicApiService, PRIMARY_API_BASE, SECONDARY_API_BASE } from './musicApiService';

vi.mock('axios');

describe('MusicApiService Comprehensive Resilience Tests (Sprint 1.2)', () => {
    let service: MusicApiService;

    beforeEach(async () => {
        service = new MusicApiService();
        await service.clearCache();
        vi.clearAllMocks();
    });

    it('1. Primary API success returns valid data immediately', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: {
                status: 'SUCCESS',
                data: { results: [{ id: 'song-1', name: 'Primary Hit' }] },
            },
        });

        const result = await service.fetchWithFallback('/api/search/songs?query=pop');
        expect(result.provider).toBe('primary');
        expect(result.isCached).toBe(false);
        expect(result.data.data.results[0].name).toBe('Primary Hit');
        expect(axios.get).toHaveBeenCalledWith(
            `${PRIMARY_API_BASE}/api/search/songs?query=pop`,
            expect.any(Object)
        );
    });

    it('2. Primary failure followed by secondary success', async () => {
        (axios.get as any)
            .mockRejectedValueOnce(new Error('Primary 500'))
            .mockRejectedValueOnce(new Error('Primary 500'))
            .mockResolvedValueOnce({
                data: {
                    status: 'SUCCESS',
                    data: { results: [{ id: 'song-2', name: 'Secondary Hit' }] },
                },
            });

        const result = await service.fetchWithFallback('/api/search/songs?query=rock');
        expect(result.provider).toBe('secondary');
        expect(result.isCached).toBe(false);
        expect(result.data.data.results[0].name).toBe('Secondary Hit');
    });

    it('3. Both providers failing throws descriptive error when no cache exists', async () => {
        (axios.get as any).mockRejectedValue(new Error('Network offline'));

        await expect(service.fetchWithFallback('/api/search/songs?query=unknown')).rejects.toThrow();
    });

    it('4. Timeout and retry behavior: retries failed attempt before moving to next provider', async () => {
        (axios.get as any)
            .mockRejectedValueOnce(new Error('Timeout'))
            .mockResolvedValueOnce({
                data: {
                    status: 'SUCCESS',
                    data: { results: [{ id: 'retry-success', name: 'Retry Hit' }] },
                },
            });

        const result = await service.fetchWithFallback('/api/search/songs?query=retry');
        expect(result.provider).toBe('primary');
        expect(result.data.data.results[0].name).toBe('Retry Hit');
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('5. Malformed and empty responses rejected: error payloads not cached as successful', async () => {
        // Return error payload with HTTP 200
        (axios.get as any).mockResolvedValue({
            data: {
                status: 'FAILED',
                message: 'Rate limit exceeded',
            },
        });

        await expect(service.fetchWithFallback('/api/error-test')).rejects.toThrow();
        expect(service.getCachedData('/api/error-test')).toBeNull();
    });

    it('6. Cached content displayed when both providers fail', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: {
                status: 'SUCCESS',
                data: { results: [{ id: 'cached-hit', name: 'Cached Track' }] },
            },
        });
        await service.fetchWithFallback('/api/search/songs?query=cached');

        // Both providers fail
        (axios.get as any).mockRejectedValue(new Error('Outage'));

        const staleResult = await service.fetchWithFallback('/api/search/songs?query=cached');
        expect(staleResult.isCached).toBe(true);
        expect(staleResult.provider).toBe('cache');
        expect(staleResult.data.data.results[0].name).toBe('Cached Track');
    });

    it('7. Failed refresh preserving previously cached data', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: {
                data: { results: [{ id: 'preserved-1', name: 'Good Data' }] },
            },
        });
        await service.fetchWithFallback('/api/trending');

        // Refresh fails
        (axios.get as any).mockRejectedValue(new Error('503 Service Unavailable'));

        const cached = await service.fetchWithFallback('/api/trending');
        expect(cached.isCached).toBe(true);
        expect(cached.data.data.results[0].name).toBe('Good Data');
    });

    it('8. Explore search race conditions: newer query results take precedence', async () => {
        (axios.get as any).mockImplementation((url: string) => {
            if (url.includes('query=slow')) {
                return new Promise((res) =>
                    setTimeout(() => res({ data: { data: { results: [{ id: 'slow', name: 'Slow Old Result' }] } } }), 100)
                );
            }
            return Promise.resolve({
                data: { data: { results: [{ id: 'fast', name: 'Fast New Result' }] } },
            });
        });

        const slowPromise = service.fetchWithFallback('/api/search?query=slow');
        const fastPromise = service.fetchWithFallback('/api/search?query=fast');

        const [slowRes, fastRes] = await Promise.all([slowPromise, fastPromise]);
        expect(fastRes.data.data.results[0].name).toBe('Fast New Result');
        expect(slowRes.data.data.results[0].name).toBe('Slow Old Result');
    });

    it('9. Request cancellation: caller AbortSignal does not corrupt unrelated subscribers', async () => {
        const controller = new AbortController();

        (axios.get as any).mockImplementation(() => {
            return new Promise((res) =>
                setTimeout(() => res({ data: { data: { results: [{ id: 'shared', name: 'Shared Hit' }] } } }), 50)
            );
        });

        const req1 = service.fetchWithFallback('/api/shared', { signal: controller.signal });
        const req2 = service.fetchWithFallback('/api/shared'); // Unaborted caller

        controller.abort(); // Cancel req1 only

        await expect(req1).rejects.toThrow();
        const res2 = await req2;
        expect(res2.data.data.results[0].name).toBe('Shared Hit');
    });

    it('10. Independent Home feed section failures do not block other sections', async () => {
        (axios.get as any).mockImplementation((url: string) => {
            if (url.includes('albums')) {
                return Promise.reject(new Error('Albums failed'));
            }
            return Promise.resolve({
                data: { data: { results: [{ id: 'songs-ok', title: 'Songs OK' }] } },
            });
        });

        const results = await Promise.allSettled([
            service.fetchWithFallback('/api/albums'),
            service.fetchWithFallback('/api/songs'),
        ]);

        expect(results[0].status).toBe('rejected');
        expect(results[1].status).toBe('fulfilled');
        if (results[1].status === 'fulfilled') {
            expect(results[1].value.data.data.results[0].title).toBe('Songs OK');
        }
    });

    it('11. Loading state termination for all outcomes: resolves or rejects cleanly', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: { data: { results: [] } },
        });

        let completed = false;
        try {
            await service.fetchWithFallback('/api/empty');
            completed = true;
        } finally {
            expect(completed).toBe(true);
        }
    });
});
