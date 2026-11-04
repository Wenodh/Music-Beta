import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';

export interface Playlist {
    id: string;
    name: string;
    songs: Song[];
    isCollaborative?: boolean;
    role?: 'owner' | 'editor' | 'viewer';
    version?: number;
    description?: string;
    collaboratorCount?: number;
}

export interface NormalizedItem {
    id: string;
    playlistId: string;
    songId: string;
    songData: Song;
    position: number;
    addedBy: string;
    addedByName?: string;
    addedAt: string;
}

interface LibraryState {
    favorites: Song[];
    playlists: Playlist[];
    normalizedPlaylistItems: Record<string, NormalizedItem[]>;
    downloadedIds: string[];
    isSyncing: boolean;
    lastSynced: string | null;
}

const initialState: LibraryState = {
    favorites: [],
    playlists: [],
    normalizedPlaylistItems: {},
    downloadedIds: [],
    isSyncing: false,
    lastSynced: null,
};

const librarySlice = createSlice({
    name: 'library',
    initialState,
    reducers: {
        setDownloadedIds: (state, action: PayloadAction<string[]>) => {
            state.downloadedIds = action.payload;
        },
        setFavorites: (state, action: PayloadAction<Song[]>) => {
            state.favorites = action.payload;
        },
        setPlaylists: (state, action: PayloadAction<Playlist[]>) => {
            state.playlists = action.payload;
        },
        updatePlaylistSongs: (state, action: PayloadAction<{ id: string; songs: Song[] }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.id);
            if (playlist) {
                playlist.songs = action.payload.songs;
            }
        },
        setPlaylistNormalizedItems: (state, action: PayloadAction<{ playlistId: string; items: NormalizedItem[] }>) => {
            state.normalizedPlaylistItems[action.payload.playlistId] = action.payload.items;
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                // Update songs array deterministically while supporting duplicates
                playlist.songs = action.payload.items.map(item => item.songData);
            }
        },
        addNormalizedItem: (state, action: PayloadAction<NormalizedItem>) => {
            const list = state.normalizedPlaylistItems[action.payload.playlistId] || [];
            list.push(action.payload);
            list.sort((a, b) => a.position - b.position);
            state.normalizedPlaylistItems[action.payload.playlistId] = list;

            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.songs = list.map(item => item.songData);
            }
        },
        removeNormalizedItem: (state, action: PayloadAction<{ playlistId: string; itemId: string }>) => {
            const list = state.normalizedPlaylistItems[action.payload.playlistId];
            if (list) {
                state.normalizedPlaylistItems[action.payload.playlistId] = list.filter(i => i.id !== action.payload.itemId);
                const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
                if (playlist) {
                    playlist.songs = state.normalizedPlaylistItems[action.payload.playlistId].map(item => item.songData);
                }
            }
        },
        togglePlaylistCollaborative: (state, action: PayloadAction<{ playlistId: string; isCollaborative: boolean }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.isCollaborative = action.payload.isCollaborative;
                if (action.payload.isCollaborative && !playlist.role) {
                    playlist.role = 'owner';
                }
            }
        },
        addDownloadedId: (state, action: PayloadAction<string>) => {
            if (!state.downloadedIds.includes(action.payload)) {
                state.downloadedIds.push(action.payload);
            }
        },
        removeDownloadedId: (state, action: PayloadAction<string>) => {
            state.downloadedIds = state.downloadedIds.filter(id => id !== action.payload);
        },
        toggleFavorite: (state, action: PayloadAction<Song>) => {
            const index = state.favorites.findIndex(s => s.id === action.payload.id);
            if (index >= 0) {
                state.favorites.splice(index, 1);
            } else {
                state.favorites.push(action.payload);
            }
        },
        createPlaylist: (state, action: PayloadAction<{ name: string; song?: Song; songs?: Song[]; id?: string; isCollaborative?: boolean }>) => {
            state.playlists.push({
                id: action.payload.id || crypto.randomUUID(),
                name: action.payload.name,
                songs: action.payload.songs ? action.payload.songs : (action.payload.song ? [action.payload.song] : []),
                isCollaborative: action.payload.isCollaborative || false,
                role: 'owner',
                version: 1
            });
        },
        deletePlaylist: (state, action: PayloadAction<string>) => {
            state.playlists = state.playlists.filter(p => p.id !== action.payload);
            delete state.normalizedPlaylistItems[action.payload];
        },
        addToPlaylist: (state, action: PayloadAction<{ playlistId: string; song: Song }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                // Supports legitimate duplicate songs in user playlists
                playlist.songs.push(action.payload.song);
            }
        },
        addBulkToPlaylist: (state, action: PayloadAction<{ playlistId: string; songs: Song[] }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.songs.push(...action.payload.songs);
            }
        },
        removeFromPlaylist: (state, action: PayloadAction<{ playlistId: string; songId: string }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.songs = playlist.songs.filter(s => s.id !== action.payload.songId);
            }
        },
        clearLibrary: (state) => {
            state.favorites = [];
            state.playlists = [];
            state.normalizedPlaylistItems = {};
            state.lastSynced = null;
        },
        setSyncing: (state, action: PayloadAction<boolean>) => {
            state.isSyncing = action.payload;
        },
        setLastSynced: (state, action: PayloadAction<string>) => {
            state.lastSynced = action.payload;
        },
    },
});

export const {
    setDownloadedIds,
    setFavorites,
    setPlaylists,
    updatePlaylistSongs,
    setPlaylistNormalizedItems,
    addNormalizedItem,
    removeNormalizedItem,
    togglePlaylistCollaborative,
    addDownloadedId,
    removeDownloadedId,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    addBulkToPlaylist,
    removeFromPlaylist,
    clearLibrary,
    setSyncing,
    setLastSynced,
} = librarySlice.actions;

export default librarySlice.reducer;
