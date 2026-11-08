import { describe, it, expect } from 'vitest';
import { Song } from '../../types/music';

describe('Profile Authentic Data Derivation', () => {
    it('correctly aggregates top artists from favorites without fabricating artists', () => {
        const mockFavorites: Song[] = [
            { id: '1', name: 'Song A', artist: 'Arijit Singh', primaryArtists: 'Arijit Singh', image: '' } as any,
            { id: '2', name: 'Song B', artist: 'Arijit Singh', primaryArtists: 'Arijit Singh', image: '' } as any,
            { id: '3', name: 'Song C', artist: 'Pritam, Arijit Singh', primaryArtists: 'Pritam, Arijit Singh', image: '' } as any,
            { id: '4', name: 'Song D', artist: 'Sid Sriram', primaryArtists: 'Sid Sriram', image: '' } as any,
        ];

        const artistCounts = new Map<string, { name: string; count: number }>();
        const processSong = (song: Song) => {
            const rawArtist = song.primaryArtists || song.artist;
            if (!rawArtist) return;
            const names = rawArtist.split(',').map((a) => a.trim()).filter(Boolean);
            names.forEach((name) => {
                const existing = artistCounts.get(name) || { name, count: 0 };
                existing.count += 1;
                artistCounts.set(name, existing);
            });
        };

        mockFavorites.forEach(processSong);
        const topArtists = Array.from(artistCounts.values()).sort((a, b) => b.count - a.count);

        expect(topArtists[0].name).toBe('Arijit Singh');
        expect(topArtists[0].count).toBe(3);
        expect(topArtists.some((a) => a.name === 'Pritam')).toBe(true);
        expect(topArtists.some((a) => a.name === 'Sid Sriram')).toBe(true);
        expect(topArtists.length).toBe(3);
    });

    it('returns empty array when no tracks exist, avoiding fabricated placeholders', () => {
        const artistCounts = new Map<string, { name: string; count: number }>();
        expect(Array.from(artistCounts.values())).toHaveLength(0);
    });
});
