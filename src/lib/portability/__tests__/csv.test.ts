import { describe, it, expect } from 'vitest';
import { exportToCsv } from '../exporters/csvExporter';
import { parseCsv, parseCsvRows } from '../parsers/csvParser';
import { Song } from '../../../types/music';

describe('CSV Parsing & Exporting', () => {
    const sampleSongs: Song[] = [
        {
            id: 'csv_1',
            name: 'Song with, comma & "quotes"',
            primaryArtists: 'Artist A, Artist B',
            duration: 180,
            image: 'https://example.com/cover.jpg',
            downloadUrl: 'https://example.com/audio.mp3',
            album: 'Awesome, Album',
            year: '2023',
        },
    ];

    it('exports songs to CSV with proper quote escaping', () => {
        const csvStr = exportToCsv(sampleSongs, 'My Playlist');
        expect(csvStr).toContain('"Song with, comma & ""quotes"""');
        expect(csvStr).toContain('"Artist A, Artist B"');
        expect(csvStr).toContain('My Playlist');
    });

    it('parses CSV rows respecting quoted commas and escaped quotes', () => {
        const rawCsv = `Title,Artist,Album\n"Song with, comma & ""quotes""","Artist A, Artist B","Awesome, Album"`;
        const rows = parseCsvRows(rawCsv);

        expect(rows).toHaveLength(2);
        expect(rows[1][0]).toBe('Song with, comma & "quotes"');
        expect(rows[1][1]).toBe('Artist A, Artist B');
        expect(rows[1][2]).toBe('Awesome, Album');
    });

    it('parses a full CSV into PortableTrack objects and detects playlists', () => {
        const rawCsv = `Title,Artist,Album,Provider ID,Playlist Name\n"Aasa Kooda","Sai Abhyankkar","Single","sa_101","Summer Vibes"\n"Katchi Sera","Sai Abhyankkar","Single","sa_102","Summer Vibes"`;
        const result = parseCsv(rawCsv);

        expect(result.errors).toHaveLength(0);
        expect(result.tracks).toHaveLength(2);
        expect(result.tracks[0].title).toBe('Aasa Kooda');
        expect(result.tracks[0].providerId).toBe('sa_101');

        expect(result.playlists).toHaveLength(1);
        expect(result.playlists[0].name).toBe('Summer Vibes');
        expect(result.playlists[0].songs).toHaveLength(2);
    });

    it('handles UTF-8 BOM and CRLF line endings', () => {
        const bomCsv = `\uFEFFTitle,Artist\r\n"Test Title","Test Artist"\r\n`;
        const result = parseCsv(bomCsv);

        expect(result.tracks).toHaveLength(1);
        expect(result.tracks[0].title).toBe('Test Title');
        expect(result.tracks[0].artist).toBe('Test Artist');
    });
});
