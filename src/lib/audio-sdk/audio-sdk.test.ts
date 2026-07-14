import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioSDK } from './index';
import { providerRegistry } from './registry';
import { MediaItem } from './models';

describe('AudioSDK', () => {
    let sdk: AudioSDK;

    beforeEach(() => {
        sdk = AudioSDK.getInstance();
        vi.clearAllMocks();
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
});
