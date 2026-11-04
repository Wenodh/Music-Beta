import { describe, it, expect } from 'vitest';
import { SmartPlaylistEngine, SmartPlaylistDefinition, EvaluationContext } from '../smartPlaylistEngine';
import { Song } from '../../types/music';

const song1: Song = {
    id: 's1',
    name: 'Anti-Hero',
    duration: 200,
    image: 'https://example.com/art1.jpg',
    downloadUrl: 'https://example.com/1.mp3',
    primaryArtists: 'Taylor Swift',
};

const song2: Song = {
    id: 's2',
    name: 'Blank Space',
    duration: 230,
    image: 'https://example.com/art2.jpg',
    downloadUrl: 'https://example.com/2.mp3',
    primaryArtists: 'Taylor Swift',
};

const song3: Song = {
    id: 's3',
    name: 'Shape of You',
    duration: 240,
    image: 'https://example.com/art3.jpg',
    downloadUrl: 'https://example.com/3.mp3',
    primaryArtists: 'Ed Sheeran',
};

describe('Sprint 3.3: Smart Playlist Engine Tests', () => {
    const engine = new SmartPlaylistEngine();

    const context: EvaluationContext = {
        favorites: [song1, song3],
        recentlyPlayed: [song1, song2],
        downloadedSongs: [song1],
        playCounts: { s1: 10, s2: 4, s3: 1 },
    };

    it('evaluates AND operator correctly across multiple rules', () => {
        const def: SmartPlaylistDefinition = {
            id: 'smart-1',
            name: 'Downloaded Favorites',
            operator: 'AND',
            rules: [
                { type: 'favorites' },
                { type: 'downloaded' }
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const result = engine.evaluate(def, context);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('s1');
    });

    it('evaluates OR operator and artist matching', () => {
        const def: SmartPlaylistDefinition = {
            id: 'smart-2',
            name: 'Taylor or Ed Sheeran',
            operator: 'OR',
            rules: [
                { type: 'artist_contains', value: 'Taylor' },
                { type: 'artist_contains', value: 'Ed Sheeran' }
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const result = engine.evaluate(def, context);
        expect(result.length).toBe(3);
    });

    it('applies sorting and result limits', () => {
        const def: SmartPlaylistDefinition = {
            id: 'smart-3',
            name: 'Top Sorted',
            operator: 'OR',
            rules: [{ type: 'favorites' }],
            sortBy: 'title',
            sortOrder: 'asc',
            limit: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const result = engine.evaluate(def, context);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Anti-Hero');
    });
});
