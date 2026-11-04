import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationEngine } from '../recommendationEngine';
import { Song } from '../../types/music';

const createSong = (id: string, name: string, artist: string): Song => ({
    id,
    name,
    duration: 200,
    image: 'https://example.com/art.jpg',
    downloadUrl: 'https://example.com/audio.mp3',
    primaryArtists: artist,
});

describe('Sprint 3.2: Recommendation Engine Tests', () => {
    let engine: RecommendationEngine;

    beforeEach(() => {
        engine = new RecommendationEngine();
    });

    it('scores candidates higher if artist matches user favorites', () => {
        const favs = [createSong('f1', 'Favorite Song', 'Taylor Swift')];
        const recents = [createSong('r1', 'Recent Song', 'Ed Sheeran')];

        const candidates = [
            createSong('c1', 'Song by Taylor Swift', 'Taylor Swift'),
            createSong('c2', 'Song by Unknown', 'Unknown Artist'),
            createSong('c3', 'Song by Ed Sheeran', 'Ed Sheeran'),
        ];

        const results = engine.scoreCandidates(candidates, { favorites: favs, recentlyPlayed: recents });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].song.primaryArtists).toBe('Taylor Swift');
        expect(results[0].reason).toContain('Because you like taylor swift');
    });

    it('filters out dismissed songs immediately', () => {
        engine.dismissSong('c1');
        const candidates = [
            createSong('c1', 'Dismissed Song', 'Taylor Swift'),
            createSong('c2', 'Safe Song', 'Ed Sheeran'),
        ];

        const results = engine.scoreCandidates(candidates, { favorites: [], recentlyPlayed: [] });
        expect(results.some(r => r.song.id === 'c1')).toBe(false);
        expect(results.some(r => r.song.id === 'c2')).toBe(true);
    });

    it('applies diversity penalty to avoid single-artist flooding', () => {
        const favs = [createSong('f1', 'Fav 1', 'Drake')];
        const candidates = [
            createSong('d1', 'Track 1', 'Drake'),
            createSong('d2', 'Track 2', 'Drake'),
            createSong('d3', 'Track 3', 'Drake'),
            createSong('d4', 'Track 4', 'Drake'),
            createSong('k1', 'Kendrick Track', 'Kendrick Lamar'),
        ];

        const results = engine.scoreCandidates(candidates, { favorites: favs, recentlyPlayed: [] }, 5);
        // Maximum 3 tracks per artist should be included before diversity capping
        const drakeCount = results.filter(r => r.song.primaryArtists === 'Drake').length;
        expect(drakeCount).toBeLessThanOrEqual(3);
    });
});
