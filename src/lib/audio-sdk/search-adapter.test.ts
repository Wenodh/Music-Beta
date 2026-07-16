import { describe, it, expect, vi } from 'vitest';
import { SearchAdapter } from './search-adapter';
import { MediaItem } from './models';

describe('SearchAdapter', () => {
    it('should map MediaItems to SearchResults correctly', () => {
        const mockItems: MediaItem[] = [
            {
                id: 'song-1',
                provider: 'test',
                type: 'song',
                title: 'Test Song',
                subtitle: 'Test Artist',
                artwork: [{ url: 'http://img.png', quality: 'high' }],
                playable: true,
                metadata: {
                    album: 'Test Album',
                    duration: 180
                }
            } as MediaItem,
            {
                id: 'album-1',
                provider: 'test',
                type: 'album',
                title: 'Test Album',
                subtitle: 'Test Artist',
                artwork: [{ url: 'http://img2.png' }],
                playable: false,
                metadata: {
                    artist: 'Test Artist'
                }
            } as MediaItem
        ];

        const results = SearchAdapter.mediaItemsToSearchResults(mockItems);

        expect(results.songs.results).toHaveLength(1);
        expect(results.songs.results[0].name).toBe('Test Song');
        expect(results.albums.results).toHaveLength(1);
        expect(results.albums.results[0].name).toBe('Test Album');
        expect(results.topQuery.results[0].name).toBe('Test Song');
    });
});
