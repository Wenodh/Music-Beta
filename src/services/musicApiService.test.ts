/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicApiService } from './musicApiService';
import axios from 'axios';

vi.mock('axios');

describe('MusicApiService Fallback & Caching', () => {
    let service: MusicApiService;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        service = new MusicApiService();
    });

    it('should return primary data when primary provider succeeds', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: { status: 'SUCCESS', data: [{ id: '1', title: 'Song A' }] },
        });

        const result = await service.fetchWithFallback('/api/search/songs?query=test');
        expect(result.provider).toBe('primary');
        expect(result.data.data[0].title).toBe('Song A');
        expect(result.isCached).toBe(false);
    });

    it('should fallback to secondary provider when primary fails', async () => {
        (axios.get as any)
            .mockRejectedValueOnce(new Error('Primary network error'))
            .mockRejectedValueOnce(new Error('Primary network error'))
            .mockResolvedValueOnce({
                data: { status: 'SUCCESS', data: [{ id: '2', title: 'Fallback Song' }] },
            });

        const result = await service.fetchWithFallback('/api/search/songs?query=fallback');
        expect(result.provider).toBe('secondary');
        expect(result.data.data[0].title).toBe('Fallback Song');
    });

    it('should fallback to cached data when both providers fail', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: { status: 'SUCCESS', data: [{ id: '3', title: 'Cached Song' }] },
        });
        await service.fetchWithFallback('/api/search/songs?query=cache_test');

        (axios.get as any).mockRejectedValue(new Error('All APIs down'));

        const cachedResult = await service.fetchWithFallback('/api/search/songs?query=cache_test');
        expect(cachedResult.provider).toBe('cache');
        expect(cachedResult.isCached).toBe(true);
        expect(cachedResult.data.data[0].title).toBe('Cached Song');
    });
});
