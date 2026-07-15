import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';
import { FavoriteItem, MediaItem } from '../../lib/audio-sdk/models';
import { songToMediaItem, mediaItemToSong } from '../../lib/adapters/mediaItemAdapter';
import { mediaItemToFavorite } from '../../lib/adapters/favoriteAdapter';

interface Playlist {
    id: string;
    name: string;
    songs: Song[];
}

interface LibraryState {
    favorites: Song[];
    favoriteItems: FavoriteItem[];
    playlists: Playlist[];
    downloadedIds: string[];
    isSyncing: boolean;
    lastSynced: string | null;
    syncStatus: 'syncing' | 'synced' | 'pending' | 'failed' | 'offline';
    pendingOps: number;
}

const initialState: LibraryState = {
    favorites: [],
    favoriteItems: [],
    playlists: [],
    downloadedIds: [],
    isSyncing: false,
    lastSynced: null,
    syncStatus: 'synced',
    pendingOps: 0,
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
            // Background migration: if favoriteItems is empty but we have cloud favorites
            if ((state.favoriteItems || []).length === 0 && (action.payload || []).length > 0) {
                state.favoriteItems = (action.payload || []).map(s => mediaItemToFavorite(songToMediaItem(s)));
            }
        },
        setFavoriteItems: (state, action: PayloadAction<FavoriteItem[]>) => {
            state.favoriteItems = action.payload;
            // Sync back to legacy favorites for UI compatibility
            state.favorites = (action.payload || [])
                .filter(f => f && f.media && f.media.type === 'song')
                .map(f => mediaItemToSong(f.media));
        },
        setPlaylists: (state, action: PayloadAction<Playlist[]>) => {
            state.playlists = action.payload;
        },
        updatePlaylistSongs: (state, action: PayloadAction<{ id: string; songs: Song[] }>) => {
            const playlist = (state.playlists || []).find(p => p.id === action.payload.id);
            if (playlist) {
                playlist.songs = action.payload.songs;
            }
        },
        addDownloadedId: (state, action: PayloadAction<string>) => {
            if (!(state.downloadedIds || []).includes(action.payload)) {
                if (!state.downloadedIds) state.downloadedIds = [];
                state.downloadedIds.push(action.payload);
            }
        },
        removeDownloadedId: (state, action: PayloadAction<string>) => {
            state.downloadedIds = (state.downloadedIds || []).filter(id => id !== action.payload);
        },
        toggleFavorite: (state, action: PayloadAction<Song>) => {
            if (!state.favorites) state.favorites = [];
            const index = state.favorites.findIndex(s => s.id === action.payload.id);
            if (index >= 0) {
                state.favorites.splice(index, 1);
            } else {
                state.favorites.push(action.payload);
            }

            // Dual sync for backward compatibility during migration
            if (!state.favoriteItems) state.favoriteItems = [];
            const itemIndex = state.favoriteItems.findIndex(f => f.id === action.payload.id);
            if (itemIndex >= 0) {
                state.favoriteItems.splice(itemIndex, 1);
            } else {
                state.favoriteItems.push(mediaItemToFavorite(songToMediaItem(action.payload)));
            }
        },
        toggleFavoriteItem: (state, action: PayloadAction<FavoriteItem>) => {
            if (!state.favoriteItems) state.favoriteItems = [];
            const index = state.favoriteItems.findIndex(f => f.id === action.payload.id);
            if (index >= 0) {
                state.favoriteItems.splice(index, 1);
            } else {
                state.favoriteItems.push(action.payload);
            }

            // Sync legacy favorites if it's a song
            if (action.payload.media.type === 'song') {
                if (!state.favorites) state.favorites = [];
                const sIndex = state.favorites.findIndex(s => s.id === action.payload.id);
                if (sIndex >= 0) {
                    state.favorites.splice(sIndex, 1);
                } else {
                    // This is lossy if we don't have the full song object,
                    // but mediaItemToSong can recover most of it.
                    // However, we shouldn't rely on this.
                }
            }
        },
        migrateFavorites: (state) => {
            // Path to migrate legacy favorites to favoriteItems
            if ((state.favorites || []).length > 0 && (state.favoriteItems || []).length === 0) {
                state.favoriteItems = (state.favorites || []).map(s =>
                    mediaItemToFavorite(songToMediaItem(s))
                );
            }
        },
        createPlaylist: (state, action: PayloadAction<{ name: string; song?: Song; songs?: Song[]; id?: string }>) => {
            if (!state.playlists) state.playlists = [];
            state.playlists.push({
                id: action.payload.id || crypto.randomUUID(),
                name: action.payload.name,
                songs: action.payload.songs ? action.payload.songs : (action.payload.song ? [action.payload.song] : []),
            });
        },
        deletePlaylist: (state, action: PayloadAction<string>) => {
            state.playlists = (state.playlists || []).filter(p => p.id !== action.payload);
        },
        addToPlaylist: (state, action: PayloadAction<{ playlistId: string; song: Song }>) => {
            const playlist = (state.playlists || []).find(p => p.id === action.payload.playlistId);
            if (playlist && !(playlist.songs || []).find(s => s.id === action.payload.song.id)) {
                if (!playlist.songs) playlist.songs = [];
                playlist.songs.push(action.payload.song);
            }
        },
        addBulkToPlaylist: (state, action: PayloadAction<{ playlistId: string; songs: Song[] }>) => {
            const playlist = (state.playlists || []).find(p => p.id === action.payload.playlistId);
            if (playlist) {
                if (!playlist.songs) playlist.songs = [];
                (action.payload.songs || []).forEach(song => {
                    if (!(playlist.songs || []).find(s => s.id === song.id)) {
                        playlist.songs.push(song);
                    }
                });
            }
        },
        removeFromPlaylist: (state, action: PayloadAction<{ playlistId: string; songId: string }>) => {
            const playlist = (state.playlists || []).find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.songs = (playlist.songs || []).filter(s => s.id !== action.payload.songId);
            }
        },
        clearLibrary: (state) => {
            state.favorites = [];
            state.favoriteItems = [];
            state.playlists = [];
            state.lastSynced = null;
        },
        setSyncing: (state, action: PayloadAction<boolean>) => {
            state.isSyncing = action.payload;
        },
        setLastSynced: (state, action: PayloadAction<string>) => {
            state.lastSynced = action.payload;
        },
        updateSyncStatus: (state, action: PayloadAction<{ status: LibraryState['syncStatus']; pendingCount: number; lastSynced?: string }>) => {
            state.syncStatus = action.payload.status;
            state.pendingOps = action.payload.pendingCount;
            if (action.payload.lastSynced) state.lastSynced = action.payload.lastSynced;
        },
    },
});

export const {
    setDownloadedIds,
    setFavorites,
    setFavoriteItems,
    setPlaylists,
    updatePlaylistSongs,
    addDownloadedId,
    removeDownloadedId,
    toggleFavorite,
    toggleFavoriteItem,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    addBulkToPlaylist,
    removeFromPlaylist,
    clearLibrary,
    migrateFavorites,
    setSyncing,
    setLastSynced,
    updateSyncStatus,
} = librarySlice.actions;

export default librarySlice.reducer;
