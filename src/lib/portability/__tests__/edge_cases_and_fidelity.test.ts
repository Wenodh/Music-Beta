import { describe, it, expect, vi } from 'vitest';
import { exportToJson } from '../exporters/jsonExporter';
import { parseJsonBackup } from '../parsers/jsonParser';
import { exportToCsv } from '../exporters/csvExporter';
import { parseCsv } from '../parsers/csvParser';
import { exportToM3u } from '../exporters/m3uExporter';
import { parseM3u } from '../parsers/m3uParser';
import { parseTxt } from '../parsers/txtParser';
import { generateImportPreview, executeImportJob } from '../orchestrator';
import { validateVibeOnBackupSchema } from '../schema';
import { createUnresolvedSong } from '../matching';
import { Song } from '../../../types/music';

describe('Comprehensive Round-Trip Fidelity & Edge Case Audit Suite', () => {
    // 1. Unicode, Telugu Text, Emojis, Special Characters
    it('preserves Telugu text, emojis, and special characters across JSON, CSV, M3U, and TXT round-trips', () => {
        const teluguSong: Song = {
            id: 'tel_101',
            name: 'సూపరు సూపరు 🚀',
            primaryArtists: 'అనురాగ్ కులకర్ణి & తమన్ 🎵',
            album: { id: 'alb_1', name: 'గుంటూరు కారం' },
            duration: 215,
            image: 'https://example.com/telugu.jpg',
            downloadUrl: 'https://example.com/telugu.mp3',
            language: 'telugu',
            year: '2024',
        };

        // JSON Round-trip
        const jsonExport = exportToJson([teluguSong], []);
        const jsonParse = parseJsonBackup(jsonExport);
        expect(jsonParse.tracks[0].title).toBe('సూపరు సూపరు 🚀');
        expect(jsonParse.tracks[0].artist).toBe('అనురాగ్ కులకర్ణి & తమన్ 🎵');

        // CSV Round-trip (with BOM)
        const csvExport = exportToCsv([teluguSong], 'తెలుగు పాటలు');
        expect(csvExport.startsWith('\uFEFF')).toBe(true);
        const csvParse = parseCsv(csvExport);
        expect(csvParse.tracks[0].title).toBe('సూపరు సూపరు 🚀');
        expect(csvParse.tracks[0].artist).toBe('అనురాగ్ కులకర్ణి & తమన్ 🎵');
        expect(csvParse.playlists[0].name).toBe('తెలుగు పాటలు');

        // M3U Round-trip
        const m3uExport = exportToM3u([teluguSong], 'తెలుగు ప్లేలిస్ట్');
        const m3uParse = parseM3u(m3uExport);
        expect(m3uParse.tracks[0].title).toBe('సూపరు సూపరు 🚀');
        expect(m3uParse.tracks[0].artist).toBe('అనురాగ్ కులకర్ణి & తమన్ 🎵');

        // TXT Parse
        const txtParse = parseTxt('అనురాగ్ కులకర్ణి & తమన్ 🎵 - సూపరు సూపరు 🚀');
        expect(txtParse.tracks[0].title).toBe('సూపరు సూపరు 🚀');
        expect(txtParse.tracks[0].artist).toBe('అనురాగ్ కులకర్ణి & తమన్ 🎵');
    });

    // 2. Empty Playlists and Empty Libraries
    it('handles empty libraries and empty playlists safely without error', () => {
        const jsonExport = exportToJson([], []);
        const jsonParse = parseJsonBackup(jsonExport);

        expect(jsonParse.tracks).toHaveLength(0);
        expect(jsonParse.playlists).toHaveLength(0);

        const preview = generateImportPreview(jsonExport, 'empty.json', [], []);
        expect(preview.totalEntries).toBe(0);

        const validation = validateVibeOnBackupSchema(JSON.parse(jsonExport));
        expect(validation.valid).toBe(true);
    });

    // 3. Incomplete or Unresolved Metadata Preservation
    it('creates a safe unresolved Song placeholder for incomplete metadata without dropping fields', () => {
        const portableTrack = {
            title: 'Unknown Mystery Song',
            artist: 'Anonymous Performer',
            sourceUrl: 'https://external.stream/link.mp3',
            provider: 'custom_source',
            providerId: 'ext_999',
        };

        const unresolved = createUnresolvedSong(portableTrack);
        expect(unresolved.id).toBe('unresolved_custom_source_ext_999');
        expect(unresolved.name).toBe('Unknown Mystery Song');
        expect(unresolved.primaryArtists).toBe('Anonymous Performer');
        expect(unresolved.downloadUrl).toBe('https://external.stream/link.mp3');
        expect(unresolved.type).toBe('custom_source');
    });

    // 4. Malformed and Unsupported Format Validation
    it('rejects malformed JSON and unsupported format versions cleanly', () => {
        const invalidJson = '{ bad json content ';
        const resBadSyntax = parseJsonBackup(invalidJson);
        expect(resBadSyntax.errors.some((e) => e.includes('JSON parse error'))).toBe(true);

        const futureVersionObj = {
            format: 'vibeon-library',
            formatVersion: 2, // future unsupported version
            exportedAt: new Date().toISOString(),
            library: { favorites: [], playlists: [] },
        };
        const resFuture = parseJsonBackup(JSON.stringify(futureVersionObj));
        expect(resFuture.errors.some((e) => e.includes('Unsupported schema formatVersion'))).toBe(true);
    });

    // 5. Replace-Mode Data Safety Safeguard
    it('forces Replace mode to safely fallback to Merge mode without deleting existing user data', async () => {
        const existingFav: Song = {
            id: 'safe_fav_1',
            name: 'Existing Safe Song',
            primaryArtists: 'Existing Artist',
            duration: 180,
            image: '',
            downloadUrl: '',
        };

        const newImportJson = exportToJson(
            [
                {
                    id: 'new_fav_1',
                    name: 'New Imported Song',
                    primaryArtists: 'New Artist',
                    duration: 200,
                    image: '',
                    downloadUrl: '',
                },
            ],
            []
        );

        const dispatch = vi.fn();
        let reduxFavs: Song[] = [existingFav];

        dispatch.mockImplementation((action: any) => {
            if (action.type === 'library/setFavorites') {
                reduxFavs = action.payload;
            }
        });

        const getState = () => ({
            auth: { user: null },
            library: { favorites: reduxFavs, playlists: [] },
        }) as any;

        const preview = generateImportPreview(newImportJson, 'import.json', reduxFavs, []);

        // Attempting import with mode: 'replace'
        const summary = await executeImportJob(
            preview,
            { mode: 'replace' },
            dispatch,
            getState
        );

        // Verify that replace mode fallback logged warning error
        expect(summary.errors.some((e) => e.includes('Replace mode is disabled for data safety'))).toBe(true);

        // Existing song MUST still be present in Redux favorites (non-destructive merge executed)
        expect(reduxFavs.some((s) => s.id === 'safe_fav_1')).toBe(true);
        expect(reduxFavs.some((s) => s.id === 'new_fav_1')).toBe(true);
        expect(reduxFavs).toHaveLength(2);
    });

    // 6. CSV Quoting and Line Ending Robustness
    it('parses multiline CSV headers and quoted fields containing commas correctly', () => {
        const csvContent = `Title,Artist,Album\r\n"Song, with comma","Artist ""Quote"" Name","Album\r\nName"`;
        const result = parseCsv(csvContent);

        expect(result.tracks).toHaveLength(1);
        expect(result.tracks[0].title).toBe('Song, with comma');
        expect(result.tracks[0].artist).toBe('Artist "Quote" Name');
    });

    // 7. TXT Parsing Ambiguity Handling
    it('handles line prefixes and plain track names in TXT parsing without throwing', () => {
        const txt = `1. Artist A - Song One\n02) Song Two Without Artist\n// Comment line\nArtist B - Song Three`;
        const res = parseTxt(txt);

        expect(res.tracks).toHaveLength(3);
        expect(res.tracks[0].title).toBe('Song One');
        expect(res.tracks[1].title).toBe('Song Two Without Artist');
        expect(res.tracks[2].artist).toBe('Artist B');
    });

    // 8. M3U #PLAYLIST directive and ordering
    it('respects #PLAYLIST directive and track ordering in M3U playlists', () => {
        const m3u = `#EXTM3U\r\n#PLAYLIST:Devotional Melodies\r\n#EXTINF:180,Anurag - Annamayya\r\nhttps://audio.com/1.mp3\r\n#EXTINF:200,SPB - Venkateswara\r\nhttps://audio.com/2.mp3`;
        const res = parseM3u(m3u);

        expect(res.playlistName).toBe('Devotional Melodies');
        expect(res.tracks).toHaveLength(2);
        expect(res.tracks[0].playlistPosition).toBe(1);
        expect(res.tracks[1].playlistPosition).toBe(2);
        expect(res.tracks[1].title).toBe('Venkateswara');
    });
});
