import { describe, it, expect, beforeEach } from 'vitest';
import libraryReducer, {
    setPlaylists,
    createPlaylist,
    togglePlaylistCollaborative,
    setPlaylistNormalizedItems,
    addNormalizedItem,
    removeNormalizedItem,
    NormalizedItem,
    Playlist
} from '../librarySlice';
import { playlistCollaborationService } from '../../../services/playlistCollaborationService';

describe('Sprint 4.4 Collaborative Playlists Redux Engine Tests', () => {
    let initialState: any;

    beforeEach(() => {
        initialState = {
            favorites: [],
            playlists: [],
            normalizedPlaylistItems: {},
            downloadedIds: [],
            isSyncing: false,
            lastSynced: null,
        };
    });

    it('should create collaborative playlist with owner role and version', () => {
        const state = libraryReducer(initialState, createPlaylist({
            name: 'Road Trip Jam',
            isCollaborative: true
        }));

        expect(state.playlists.length).toBe(1);
        expect(state.playlists[0].name).toBe('Road Trip Jam');
        expect(state.playlists[0].isCollaborative).toBe(true);
        expect(state.playlists[0].role).toBe('owner');
        expect(state.playlists[0].version).toBe(1);
    });

    it('should toggle collaboration state and preserve playlist ID and songs', () => {
        let state = libraryReducer(initialState, createPlaylist({
            name: 'Study Lo-Fi',
            id: 'study_123',
            song: { id: 's1', name: 'Chill Track', artist: 'Artist A' } as any
        }));

        state = libraryReducer(state, togglePlaylistCollaborative({ playlistId: 'study_123', isCollaborative: true }));
        expect(state.playlists[0].isCollaborative).toBe(true);
        expect(state.playlists[0].songs.length).toBe(1);
        expect(state.playlists[0].songs[0].name).toBe('Chill Track');
    });

    it('should support duplicate tracks in collaborative playlist normalized items', () => {
        const items: NormalizedItem[] = [
            {
                id: 'item_uuid_1',
                playlistId: 'pl_collab',
                songId: 'song_repeated',
                songData: { id: 'song_repeated', name: 'Song Repeat', artist: 'Band' } as any,
                position: 1000.0,
                addedBy: 'user_1',
                addedByName: 'Host',
                addedAt: '2026-11-04T00:00:00Z'
            },
            {
                id: 'item_uuid_2',
                playlistId: 'pl_collab',
                songId: 'song_middle',
                songData: { id: 'song_middle', name: 'Song Middle', artist: 'Band' } as any,
                position: 2000.0,
                addedBy: 'user_2',
                addedByName: 'Editor',
                addedAt: '2026-11-04T00:01:00Z'
            },
            {
                id: 'item_uuid_3',
                playlistId: 'pl_collab',
                songId: 'song_repeated', // Duplicate track instance!
                songData: { id: 'song_repeated', name: 'Song Repeat', artist: 'Band' } as any,
                position: 3000.0,
                addedBy: 'user_1',
                addedByName: 'Host',
                addedAt: '2026-11-04T00:02:00Z'
            }
        ];

        let state = libraryReducer(initialState, createPlaylist({ name: 'Collab Pl', id: 'pl_collab', isCollaborative: true }));
        state = libraryReducer(state, setPlaylistNormalizedItems({ playlistId: 'pl_collab', items }));

        expect(state.normalizedPlaylistItems['pl_collab'].length).toBe(3);
        expect(state.playlists[0].songs.length).toBe(3);
        expect(state.playlists[0].songs[0].id).toBe('song_repeated');
        expect(state.playlists[0].songs[2].id).toBe('song_repeated');
        expect(state.normalizedPlaylistItems['pl_collab'][0].id).not.toBe(state.normalizedPlaylistItems['pl_collab'][2].id);
    });

    it('should handle fractional midpoint insertions and reordering', () => {
        const items: NormalizedItem[] = [
            {
                id: 'i1',
                playlistId: 'pl_fractional',
                songId: 's1',
                songData: { id: 's1', name: 'First' } as any,
                position: 1000.0,
                addedBy: 'u1',
                addedAt: '2026-11-04T00:00:00Z'
            },
            {
                id: 'i2',
                playlistId: 'pl_fractional',
                songId: 's2',
                songData: { id: 's2', name: 'Second' } as any,
                position: 2000.0,
                addedBy: 'u1',
                addedAt: '2026-11-04T00:00:00Z'
            }
        ];

        let state = libraryReducer(initialState, createPlaylist({ name: 'Fractional', id: 'pl_fractional', isCollaborative: true }));
        state = libraryReducer(state, setPlaylistNormalizedItems({ playlistId: 'pl_fractional', items }));

        // Insert item between i1 and i2 (Midpoint: (1000 + 2000) / 2 = 1500.0)
        const midpointItem: NormalizedItem = {
            id: 'i_mid',
            playlistId: 'pl_fractional',
            songId: 's_mid',
            songData: { id: 's_mid', name: 'Middle' } as any,
            position: 1500.0,
            addedBy: 'u2',
            addedAt: '2026-11-04T00:05:00Z'
        };

        state = libraryReducer(state, addNormalizedItem(midpointItem));
        const currentList = state.normalizedPlaylistItems['pl_fractional'];

        expect(currentList.length).toBe(3);
        expect(currentList[0].id).toBe('i1');
        expect(currentList[1].id).toBe('i_mid'); // Correctly ordered in the middle
        expect(currentList[2].id).toBe('i2');
    });

    it('should reconcile legacy JSONB songs with normalized items safely', () => {
        const legacySongs = [
            { id: 'track_a', name: 'Track A' } as any,
            { id: 'track_b', name: 'Track B' } as any
        ];

        const normalizedItems: any[] = [
            { id: 'item_1', songId: 'track_a' },
            { id: 'item_2', songId: 'track_b' }
        ];

        const reconciliation = playlistCollaborationService.reconcileWithLegacyJsonb(legacySongs, normalizedItems);
        expect(reconciliation.match).toBe(true);
        expect(reconciliation.legacyCount).toBe(2);
        expect(reconciliation.normalizedCount).toBe(2);
    });

    it('should remove normalized item and preserve remaining sequence', () => {
        const items: NormalizedItem[] = [
            { id: 'i1', playlistId: 'p1', songId: 's1', songData: { id: 's1' } as any, position: 1000, addedBy: 'u1', addedAt: 't1' },
            { id: 'i2', playlistId: 'p1', songId: 's2', songData: { id: 's2' } as any, position: 2000, addedBy: 'u1', addedAt: 't2' }
        ];

        let state = libraryReducer(initialState, createPlaylist({ name: 'P', id: 'p1', isCollaborative: true }));
        state = libraryReducer(state, setPlaylistNormalizedItems({ playlistId: 'p1', items }));
        state = libraryReducer(state, removeNormalizedItem({ playlistId: 'p1', itemId: 'i1' }));

        expect(state.normalizedPlaylistItems['p1'].length).toBe(1);
        expect(state.normalizedPlaylistItems['p1'][0].id).toBe('i2');
        expect(state.playlists[0].songs.length).toBe(1);
    });
});
