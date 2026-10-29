import { describe, it, expect } from 'vitest';
import { parseM3u } from '../parsers/m3uParser';
import { exportToM3u } from '../exporters/m3uExporter';
import { Song } from '../../../types/music';

describe('M3U / M3U8 Playlist Parsing & Exporting', () => {
    const sampleM3u = `#EXTM3U
#PLAYLIST:Workout Hits
#EXTINF:210,Sid Sriram - Samajavaragamana
https://example.com/audio/samajavaragamana.mp3
#EXTINF:195,Anirudh - Badass
/local/music/badass.mp3`;

    it('parses #EXTINF lines, artist, title, duration, and audio location URLs', () => {
        const result = parseM3u(sampleM3u, 'workout.m3u8');

        expect(result.tracks).toHaveLength(2);
        expect(result.tracks[0].artist).toBe('Sid Sriram');
        expect(result.tracks[0].title).toBe('Samajavaragamana');
        expect(result.tracks[0].duration).toBe(210);
        expect(result.tracks[0].sourceUrl).toBe('https://example.com/audio/samajavaragamana.mp3');

        expect(result.tracks[1].artist).toBe('Anirudh');
        expect(result.tracks[1].title).toBe('Badass');
        expect(result.tracks[1].playlistPosition).toBe(2);
    });

    it('exports playlist to M3U8 format', () => {
        const songs: Song[] = [
            {
                id: 'm3u_1',
                name: 'Fear Song',
                primaryArtists: 'Anirudh Ravichander',
                duration: 200,
                image: '',
                downloadUrl: 'https://example.com/stream/fear.mp3',
            },
        ];

        const m3uStr = exportToM3u(songs, 'Devara');
        expect(m3uStr).toContain('#EXTM3U');
        expect(m3uStr).toContain('#PLAYLIST:Devara');
        expect(m3uStr).toContain('#EXTINF:200,Anirudh Ravichander - Fear Song');
        expect(m3uStr).toContain('https://example.com/stream/fear.mp3');
    });
});
