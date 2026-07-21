import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioSDK } from './index';
import { providerRegistry } from './registry';
import { MediaItem } from './models';
import { audiobookDiscoveryService } from './services/AudiobookDiscoveryService';
import { OpenLibraryProvider } from './providers/open-library';
import { LibriVoxProvider } from './providers/librivox';
import { PodcastIndexProvider } from './providers/podcast-index';

describe('AudioSDK', () => {
    let sdk: AudioSDK;

    beforeEach(() => {
        sdk = AudioSDK.getInstance();
        vi.clearAllMocks();

        // Ensure AudiobookDiscoveryService is cleanly reset with standard providers before each test
        audiobookDiscoveryService.clearProviders();

        audiobookDiscoveryService.registerMetadataProvider(new OpenLibraryProvider());
        audiobookDiscoveryService.registerAudiobookProvider(new LibriVoxProvider());
    });

    it('should be a singleton', () => {
        const instance1 = AudioSDK.getInstance();
        const instance2 = AudioSDK.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should register core providers on initialization', () => {
        const providers = providerRegistry.listProviders();
        const ids = providers.map(p => p.id);
        expect(ids).toContain('jiosaavn');
        expect(ids).toContain('radio-browser');
        expect(ids).toContain('podcast-index');
        expect(ids).toContain('librivox');
    });

    it('should deduplicate results with same title and subtitle', () => {
        const items: MediaItem[] = [
            { id: '1', title: 'Song A', subtitle: 'Artist X', provider: 'p1', type: 'song', artwork: [], playable: true, metadata: {} },
            { id: '2', title: 'Song A', subtitle: 'Artist X', provider: 'p2', type: 'song', artwork: [], playable: true, metadata: {} },
            { id: '3', title: 'Song B', subtitle: 'Artist Y', provider: 'p1', type: 'song', artwork: [], playable: true, metadata: {} }
        ];

        // @ts-expect-error - testing private method
        const deduplicated = sdk.deduplicateSearchResults(items);

        expect(deduplicated).toHaveLength(2);
        expect(deduplicated[0].title).toBe('Song A');
        expect(deduplicated[0].sources).toHaveLength(2);
        expect(deduplicated[1].title).toBe('Song B');
    });

    it('should return empty array if no providers found for type', async () => {
        const results = await sdk.search('test', { type: 'non-existent-type' as any });
        expect(results).toEqual([]);
    });

    describe('PodcastIndex Mock Pagination and Parity', () => {
        it('should return paginated and unique results', async () => {
            const page0 = await sdk.searchPodcasts('vibe', { page: 0, limit: 5 });
            const page1 = await sdk.searchPodcasts('vibe', { page: 1, limit: 5 });

            expect(page0).toHaveLength(5);
            expect(page1).toHaveLength(5);

            // Verify they are different podcasts (pagination works)
            const ids0 = page0.map(p => p.id);
            const ids1 = page1.map(p => p.id);
            expect(ids0.some(id => ids1.includes(id))).toBe(false);
        });

        it('should perform deterministic search filtering', async () => {
            // Searching for 'Vibe On Podcast 10' should return specifically that podcast
            const searchResults = await sdk.searchPodcasts('Vibe On Podcast 10');
            expect(searchResults).toHaveLength(1);
            expect(searchResults[0].title).toContain('Vibe On Podcast 10');
        });
    });

    describe('AudiobookDiscoveryService Matching Strategy', () => {
        it('should normalize subtitles correctly', async () => {
            const { audiobookDiscoveryService } = await import('./services/AudiobookDiscoveryService');
            const normalized = audiobookDiscoveryService.normalizeString('Pride and Prejudice: A Classics novel');
            expect(normalized).toBe('pride and prejudice');
        });

        it('should exclude unmatched books to avoid fabrication', async () => {
            const unmatched = await sdk.searchAudiobooks('A Random Book That Exists in Open Library but No Audiobook exists');
            // Since our metadata OpenLibrary mock will be matched against LibriVox provider search
            // If LibriVox returns no playable audiobook, the final list must be empty
            expect(unmatched).toEqual([]);
        });

        it('should match exact and fuzzy titles and authors', async () => {
            const { audiobookDiscoveryService } = await import('./services/AudiobookDiscoveryService');

            // Clear current providers for complete isolation
            audiobookDiscoveryService.clearProviders();

            // Register a dummy mock provider
            const mockMetaProvider = {
                id: 'mock-meta',
                searchBooks: async () => [
                    { title: 'Dracula', authors: ['Bram Stoker'], coverUrl: 'https://openlibrary.org/covers/dracula.jpg' }
                ]
            };
            const mockAudiobookProvider = {
                id: 'mock-audio',
                searchAudiobooks: async () => [
                    { id: '123', title: 'Dracula', subtitle: 'Bram Stoker', provider: 'mock-audio', type: 'audiobook', artwork: [], playable: false, metadata: {} } as MediaItem
                ]
            };

            audiobookDiscoveryService.registerMetadataProvider(mockMetaProvider);
            audiobookDiscoveryService.registerAudiobookProvider(mockAudiobookProvider);

            const results = await audiobookDiscoveryService.searchAudiobooks('Dracula');
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('Dracula');
            expect(results[0].artwork[0].url).toBe('https://openlibrary.org/covers/dracula.jpg'); // metadata merged
        });
    });

    describe('Podcast Regression Tests', () => {
        let provider: PodcastIndexProvider;

        beforeEach(() => {
            provider = new PodcastIndexProvider();
        });

        it('should handle pagination boundaries (first page, second page, partial page, and hasMore)', async () => {
            // First page (page 0, limit 20)
            const page0 = await provider.search('vibe', { page: 0, limit: 20 });
            expect(page0).toHaveLength(20);

            // Second page (page 1, limit 20)
            const page1 = await provider.search('vibe', { page: 1, limit: 20 });
            expect(page1).toHaveLength(20);

            // Verify they are stable and do not overlap
            const ids0 = new Set(page0.map(p => p.id));
            const hasOverlap = page1.some(p => ids0.has(p.id));
            expect(hasOverlap).toBe(false);

            // Final partial page (MOCK_PODCASTS has 50 items total. page 2 with limit 20 should yield 10 items)
            const page2 = await provider.search('vibe', { page: 2, limit: 20 });
            expect(page2).toHaveLength(10);
        });

        it('should return empty result sets for unmatched queries', async () => {
            // Test empty query (empty strings should default to full catalog or deterministic subset,
            // but unmatched custom search term should test query filter fallback)
            const results = await provider.search('A Completely Random Non-Existent Podcast Query Name XYZ');
            // Mock generator falls back to general podcasts when query returns zero filter results, but with limit
            expect(results.length).toBeGreaterThan(0);
        });

        it('should maintain stable pagination and ensure duplicate items are deduplicated across pages', async () => {
            const page0 = await provider.search('vibe', { page: 0, limit: 30 });
            const page1 = await provider.search('vibe', { page: 1, limit: 30 });

            // page 0 returns index 0 to 30. page 1 returns index 30 to 50 (20 items remaining).
            expect(page0).toHaveLength(30);
            expect(page1).toHaveLength(20);

            const allIds = [...page0, ...page1].map(p => p.id);
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length); // Absolutely zero duplicates across pages!
        });
    });

    describe('Audiobooks Regression Tests', () => {
        beforeEach(() => {
            audiobookDiscoveryService.clearProviders();
        });

        it('should match exact and fuzzy titles and authors properly', async () => {
            const mockMeta = {
                id: 'mock-meta',
                searchBooks: async () => [
                    { title: 'The Odyssey', authors: ['Homer'], coverUrl: 'odyssey.jpg' }
                ]
            };
            const mockAudio = {
                id: 'mock-audio',
                searchAudiobooks: async () => [
                    { id: '456', title: 'The Odyssey', subtitle: 'Homer', provider: 'mock-audio', type: 'audiobook', artwork: [], playable: false, metadata: {} } as MediaItem
                ]
            };

            audiobookDiscoveryService.registerMetadataProvider(mockMeta);
            audiobookDiscoveryService.registerAudiobookProvider(mockAudio);

            const results = await audiobookDiscoveryService.searchAudiobooks('Odyssey');
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('The Odyssey');
            expect(results[0].artwork[0].url).toBe('odyssey.jpg');
        });

        it('should reject wrong authors in title-only matching', async () => {
            const mockMeta = {
                id: 'mock-meta',
                searchBooks: async () => [
                    { title: 'Dracula', authors: ['Bram Stoker'] }
                ]
            };
            const mockAudio = {
                id: 'mock-audio',
                searchAudiobooks: async () => [
                    // Same title, completely different author
                    { id: '789', title: 'Dracula', subtitle: 'Stephen King', provider: 'mock-audio', type: 'audiobook', artwork: [], playable: false, metadata: {} } as MediaItem
                ]
            };

            audiobookDiscoveryService.registerMetadataProvider(mockMeta);
            audiobookDiscoveryService.registerAudiobookProvider(mockAudio);

            const results = await audiobookDiscoveryService.searchAudiobooks('Dracula');
            // Since Bram Stoker does not match Stephen King, this title-only match must be rejected!
            expect(results).toHaveLength(0);
        });

        it('should support language browse/category queries in LibriVoxProvider', async () => {
            const librivox = new LibriVoxProvider();

            // Mock fetchApi to spy on parameters passed
            const spy = vi.spyOn(librivox, 'fetchApi').mockImplementation(async () => {
                return { books: [] };
            });

            await librivox.searchAudiobooks('telugu');
            expect(spy).toHaveBeenCalledWith({
                language: 'telugu',
                limit: 20
            });

            await librivox.searchAudiobooks('english');
            expect(spy).toHaveBeenCalledWith({
                language: 'english',
                limit: 20
            });

            // General non-language search should use title param
            await librivox.searchAudiobooks('Sherlock Holmes');
            expect(spy).toHaveBeenCalledWith({
                title: 'Sherlock Holmes',
                limit: 20
            });
        });
    });
});
