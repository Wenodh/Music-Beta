import { describe, it, expect, vi } from 'vitest';
import { generateImportPreview, executeImportJob } from '../orchestrator';
import { exportToJson } from '../exporters/jsonExporter';
import { Song } from '../../../types/music';

describe('Import Orchestrator & Integration Roundtrip Test', () => {
    const originalFavorites: Song[] = [
        {
            id: 'fav_1',
            name: 'Priya Mithunam',
            primaryArtists: 'Sid Sriram',
            duration: 210,
            image: 'https://example.com/fav1.jpg',
            downloadUrl: 'https://example.com/fav1.mp3',
        },
    ];

    const originalPlaylists = [
        {
            id: 'pl_100',
            name: 'Melodies',
            songs: [
                {
                    id: 'pl_song_1',
                    name: 'Inkem Inkem',
                    primaryArtists: 'Sid Sriram',
                    duration: 260,
                    image: 'https://example.com/inkem.jpg',
                    downloadUrl: 'https://example.com/inkem.mp3',
                },
            ],
        },
    ];

    it('executes full round-trip export -> import into clean library -> verify data', async () => {
        // 1. Export complete backup JSON
        const backupJson = exportToJson(originalFavorites, originalPlaylists, '1.3.1');

        // 2. Generate import preview for clean target library
        const preview = generateImportPreview(backupJson, 'backup.json', [], []);

        expect(preview.fileType).toBe('json');
        expect(preview.totalEntries).toBe(2); // 1 favorite + 1 playlist song

        // Mock dispatch & state
        const dispatch = vi.fn();
        let currentReduxFavorites: Song[] = [];
        let currentReduxPlaylists: any[] = [];

        dispatch.mockImplementation((action: any) => {
            if (action.type === 'library/setFavorites') {
                currentReduxFavorites = action.payload;
            }
            if (action.type === 'library/setPlaylists') {
                currentReduxPlaylists = action.payload;
            }
        });

        const getState = () => ({
            auth: { user: null },
            library: { favorites: currentReduxFavorites, playlists: currentReduxPlaylists },
        }) as any;

        // 3. Execute import job
        const summary = await executeImportJob(
            preview,
            { mode: 'merge' },
            dispatch,
            getState
        );

        expect(summary.newlyImported).toBeGreaterThan(0);
        expect(summary.failedWrites).toBe(0);

        // Verify Redux state updated with exported content
        expect(currentReduxFavorites).toHaveLength(1);
        expect(currentReduxFavorites[0].name).toBe('Priya Mithunam');

        expect(currentReduxPlaylists).toHaveLength(1);
        expect(currentReduxPlaylists[0].name).toBe('Melodies');
        expect(currentReduxPlaylists[0].songs[0].name).toBe('Inkem Inkem');
    });

    it('guarantees duplicate idempotency when running repeat import', async () => {
        const backupJson = exportToJson(originalFavorites, originalPlaylists, '1.3.1');

        const dispatch = vi.fn();
        let currentReduxFavorites: Song[] = [...originalFavorites];
        let currentReduxPlaylists: any[] = [...originalPlaylists];

        dispatch.mockImplementation((action: any) => {
            if (action.type === 'library/setFavorites') {
                currentReduxFavorites = action.payload;
            }
            if (action.type === 'library/setPlaylists') {
                currentReduxPlaylists = action.payload;
            }
        });

        const getState = () => ({
            auth: { user: null },
            library: { favorites: currentReduxFavorites, playlists: currentReduxPlaylists },
        }) as any;

        const preview = generateImportPreview(backupJson, 'backup.json', currentReduxFavorites, currentReduxPlaylists);

        // Execute import on library that ALREADY has these items
        const summary = await executeImportJob(
            preview,
            { mode: 'merge' },
            dispatch,
            getState
        );

        expect(summary.alreadyPresent).toBe(2);
        expect(summary.newlyImported).toBe(0);

        // Ensure state length did not double unintentionally
        expect(currentReduxFavorites).toHaveLength(1);
        expect(currentReduxPlaylists[0].songs).toHaveLength(1);
    });
});
