import { describe, it, expect } from 'vitest';
import { parseTxt, parseTxtLine } from '../parsers/txtParser';
import { exportToTxt } from '../exporters/txtExporter';
import { Song } from '../../../types/music';

describe('TXT Line Parsing & Exporting', () => {
    it('parses "Artist - Song Title" lines cleanly', () => {
        const line = 'Anirudh Ravichander - Hukum';
        const track = parseTxtLine(line, line);

        expect(track.artist).toBe('Anirudh Ravichander');
        expect(track.title).toBe('Hukum');
    });

    it('strips track numbering prefixes like "01. " or "1 - "', () => {
        const txt = `01. Anirudh Ravichander - Hukum\n02) A.R. Rahman - Jai Ho\n3 - Devi Sri Prasad - Oo Antava`;
        const result = parseTxt(txt);

        expect(result.tracks).toHaveLength(3);
        expect(result.tracks[0].title).toBe('Hukum');
        expect(result.tracks[1].artist).toBe('A.R. Rahman');
        expect(result.tracks[2].title).toBe('Oo Antava');
    });

    it('exports songs array to TXT format', () => {
        const songs: Song[] = [
            { id: '1', name: 'Naatu Naatu', primaryArtists: 'MM Keeravani, Rahul Sipligunj', duration: 215, image: '', downloadUrl: '' },
        ];

        const txt = exportToTxt(songs);
        expect(txt).toBe('MM Keeravani, Rahul Sipligunj - Naatu Naatu');
    });
});
