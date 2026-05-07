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
}

const initialState: LibraryState = {
    favorites: [],
    playlists: [],
};

const librarySlice = createSlice({
    name: 'library',
    initialState,
    reducers: {
        toggleFavorite: (state, action: PayloadAction<Song>) => {
            const index = state.favorites.findIndex(s => s.id === action.payload.id);
            if (index >= 0) {
                state.favorites.splice(index, 1);
            } else {
                state.favorites.push(action.payload);
            }
        },
        createPlaylist: (state, action: PayloadAction<string>) => {
            state.playlists.push({
                id: Date.now().toString(),
                name: action.payload,
                songs: [],
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
        removeFromPlaylist: (state, action: PayloadAction<{ playlistId: string; songId: string }>) => {
            const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
            if (playlist) {
                playlist.songs = playlist.songs.filter(s => s.id !== action.payload.songId);
            }
        },
    },
});

export const {
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
} = librarySlice.actions;

export default librarySlice.reducer;
