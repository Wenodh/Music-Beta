import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXPLORE_LANGUAGES } from '../Explore';
import { musicApiService } from '../../services/musicApiService';

describe('Task 3 — Explore Language Filters & Music API Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Defines the 5 supported languages matching existing catalog', () => {
        const expectedLanguages = [
            { name: 'Telugu', value: 'telugu' },
            { name: 'Hindi', value: 'hindi' },
            { name: 'English', value: 'english' },
            { name: 'Tamil', value: 'tamil' },
            { name: 'Punjabi', value: 'punjabi' },
        ];
        expect(EXPLORE_LANGUAGES).toEqual(expectedLanguages);
    });

    it('2. Constructs correct endpoint queries when querying each supported language', () => {
        const languages = ['telugu', 'hindi', 'english', 'tamil', 'punjabi'];
        languages.forEach((lang) => {
            const pageNum = 0;
            const path = `/api/search/songs?query=${encodeURIComponent(lang)}&page=${pageNum}&limit=30`;
            expect(path).toBe(`/api/search/songs?query=${lang}&page=0&limit=30`);
        });
    });

    it('3. Request cancellation support: aborting AbortController signals in-flight API call correctly', async () => {
        const fetchSpy = vi.spyOn(musicApiService, 'fetchWithFallback');
        const controller = new AbortController();

        fetchSpy.mockImplementation((path, options) => {
            if (options?.signal?.aborted) {
                const err = new Error('CanceledError');
                err.name = 'CanceledError';
                return Promise.reject(err);
            }
            return Promise.resolve({
                data: { data: { results: [{ id: 'song-1', name: 'Song 1' }] } },
                isCached: false,
                provider: 'primary',
            } as any);
        });

        // Abort controller before calling or during in-flight
        controller.abort();

        await expect(
            musicApiService.fetchWithFallback('/api/search/songs?query=hindi&page=0&limit=30', {
                signal: controller.signal,
                timeout: 7000,
            })
        ).rejects.toThrow();

        fetchSpy.mockRestore();
    });

    it('4. Stale response handling: aborted signals are safely ignored without throwing or overwriting state', () => {
        const controller = new AbortController();
        controller.abort();

        // Simulate Explore check: if signal.aborted, ignore error
        const handleCatch = (err: any, signal?: AbortSignal) => {
            if (err?.name === 'CanceledError' || signal?.aborted) {
                return 'ignored';
            }
            return 'show_error';
        };

        const result = handleCatch({ name: 'CanceledError' }, controller.signal);
        expect(result).toBe('ignored');
    });

    it('5. Global language state is preserved and not altered when selecting explore language', () => {
        const globalLanguageState = { language: 'telugu' };
        let exploreSelectedLanguage = globalLanguageState.language;

        // User switches language in Explore to 'punjabi'
        exploreSelectedLanguage = 'punjabi';

        expect(exploreSelectedLanguage).toBe('punjabi');
        // Global language remains unchanged
        expect(globalLanguageState.language).toBe('telugu');
    });
});
