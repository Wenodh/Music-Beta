import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';

interface Playlist {
    id: string;
    name: string;
    songs: Song[];
}

interface LibraryState {
    favorites: Song[];
    playlists: Playlist[];
    downloadedIds: string[];
}

const initialState: LibraryState = {
    favorites: [],
    playlists: [],
    downloadedIds: [],
};

const librarySlice = createSlice({
    name: 'library',
    initialState,
    reducers: {
        setDownloadedIds: (state, action: PayloadAction<string[]>) => {
            state.downloadedIds = action.payload;
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
        createPlaylist: (state, action: PayloadAction<{ name: string; song?: Song; songs?: Song[] }>) => {
            state.playlists.push({
                id: Date.now().toString(),
                name: action.payload.name,
                songs: action.payload.songs ? action.payload.songs : (action.payload.song ? [action.payload.song] : []),
            });
        },
        deletePlaylist: (state, action: PayloadAction<string>) => {
            state.playlists = state.playlists.filter(p => p.id !== action.payload);
        },
        addToPlaylist: (state, action: PayloadAction<{ playlistId: string; song: Song }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist && !playlist.songs.find(s => s.id === action.payload.song.id)) {
                playlist.songs.push(action.payload.song);
            }
        },
        addBulkToPlaylist: (state, action: PayloadAction<{ playlistId: string; songs: Song[] }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                action.payload.songs.forEach(song => {
                    if (!playlist.songs.find(s => s.id === song.id)) {
                        playlist.songs.push(song);
                    }
                });
            }
        },
        removeFromPlaylist: (state, action: PayloadAction<{ playlistId: string; songId: string }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.songs = playlist.songs.filter(s => s.id !== action.payload.songId);
            }
        },
    },
});

export const {
    setDownloadedIds,
    addDownloadedId,
    removeDownloadedId,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    addBulkToPlaylist,
    removeFromPlaylist,
} = librarySlice.actions;

export default librarySlice.reducer;
