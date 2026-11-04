import { describe, it, expect } from 'vitest';
import { calculateListeningStats, ListeningSessionEvent } from '../analyticsService';

describe('Sprint 3.4: Listening Analytics Calculation Tests', () => {
    const now = 1700000000000;
    const oneDay = 24 * 60 * 60 * 1000;

    const events: ListeningSessionEvent[] = [
        {
            id: 'e1',
            songId: 's1',
            songName: 'Anti-Hero',
            artistName: 'Taylor Swift',
            durationPlayedSeconds: 200,
            completionPercentage: 100,
            playbackSpeed: 1.0,
            timestamp: now - oneDay, // 1 day ago
        },
        {
            id: 'e2',
            songId: 's1',
            songName: 'Anti-Hero',
            artistName: 'Taylor Swift',
            durationPlayedSeconds: 200,
            completionPercentage: 100,
            playbackSpeed: 2.0, // Played at 2x: 100 seconds real time
            timestamp: now - 2 * oneDay, // 2 days ago
        },
        {
            id: 'e3',
            songId: 's2',
            songName: 'Shape of You',
            artistName: 'Ed Sheeran',
            durationPlayedSeconds: 150,
            completionPercentage: 80,
            playbackSpeed: 1.0,
            timestamp: now - 15 * oneDay, // 15 days ago
        },
    ];

    it('calculates total listening time factoring in playback speed correctly', () => {
        // Range: 7 days includes e1 (200s) and e2 (100s) = 300s
        const stats = calculateListeningStats(events, '7d', now);
        expect(stats.totalTracksPlayed).toBe(2);
        expect(stats.totalListeningTimeSeconds).toBe(300);
        expect(stats.topArtists[0].artist).toBe('Taylor Swift');
        expect(stats.topTracks[0].count).toBe(2);
    });

    it('respects time filter range cutoff', () => {
        // Range: 30 days includes e1, e2, and e3
        const stats = calculateListeningStats(events, '30d', now);
        expect(stats.totalTracksPlayed).toBe(3);
        expect(stats.totalListeningTimeSeconds).toBe(450); // 200 + 100 + 150
    });
});
