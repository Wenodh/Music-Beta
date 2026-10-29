import { describe, it, expect } from 'vitest';
import { exportToJson } from '../exporters/jsonExporter';
import { parseJsonBackup } from '../parsers/jsonParser';
import { validateVibeOnBackupSchema } from '../schema';
import { Song } from '../../../types/music';

describe('JSON Backup & Restore', () => {
    const sampleFavorites: Song[] = [
        {
            id: 'song_1',
            name: 'Kurchi Madathapetti',
            primaryArtists: 'Thaman S, Sri Krishna',
            duration: 215,
            image: 'https://example.com/cover1.jpg',
            downloadUrl: 'https://example.com/audio1.mp3',
            album: { id: 'alb_1', name: 'Guntur Kaaram' },
            year: '2024',
        },
    ];

    const samplePlaylists = [
        {
            id: 'pl_1',
            name: 'Telugu Hits',
            songs: [
                {
                    id: 'song_2',
                    name: 'Ramuloo Ramulaa',
                    primaryArtists: 'Thaman S, Anurag Kulkarni',
                    duration: 234,
                    image: 'https://example.com/cover2.jpg',
                    downloadUrl: 'https://example.com/audio2.mp3',
                    album: { id: 'alb_2', name: 'Ala Vaikunthapurramuloo' },
                    year: '2020',
                },
            ],
        },
    ];

    it('exports a valid Vibe On JSON backup envelope (v1)', () => {
        const jsonStr = exportToJson(sampleFavorites, samplePlaylists, '1.3.1');
        expect(jsonStr).toBeTypeOf('string');

        const parsed = JSON.parse(jsonStr);
        expect(parsed.format).toBe('vibeon-library');
        expect(parsed.formatVersion).toBe(1);
        expect(parsed.library.favorites).toHaveLength(1);
        expect(parsed.library.playlists).toHaveLength(1);
    });

    it('validates JSON backup schema correctly', () => {
        const jsonStr = exportToJson(sampleFavorites, samplePlaylists);
        const parsed = JSON.parse(jsonStr);

        const validation = validateVibeOnBackupSchema(parsed);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.version).toBe(1);
    });

    it('rejects malformed or unsupported schema version JSON files', () => {
        const malformed = { format: 'vibeon-library', formatVersion: 99, library: {} };
        const validation = validateVibeOnBackupSchema(malformed);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('Unsupported schema formatVersion'))).toBe(true);
    });

    it('parses exported JSON backup back into tracks and playlists', () => {
        const jsonStr = exportToJson(sampleFavorites, samplePlaylists);
        const res = parseJsonBackup(jsonStr);

        expect(res.isVibeOnFormat).toBe(true);
        expect(res.errors).toHaveLength(0);
        expect(res.tracks).toHaveLength(1);
        expect(res.playlists).toHaveLength(1);

        expect(res.tracks[0].title).toBe('Kurchi Madathapetti');
        expect(res.playlists[0].name).toBe('Telugu Hits');
        expect(res.playlists[0].songs[0].title).toBe('Ramuloo Ramulaa');
    });
});
