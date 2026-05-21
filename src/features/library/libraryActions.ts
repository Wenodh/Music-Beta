import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import { RootState } from '../../store';
import { Song } from '../../types/music';
import { setFavorites, setPlaylists } from './librarySlice';

export const syncLibrary = createAsyncThunk(
    'library/sync',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.auth.user;

        if (!user) return;

        try {
            // 1. Sync Favorites
            const { data: cloudFavs, error: favError } = await supabase
                .from('favorites')
                .select('song_data')
                .eq('user_id', user.id);

            if (!favError && cloudFavs) {
                const songs = cloudFavs.map(f => f.song_data as Song);
                dispatch(setFavorites(songs));
            }

            // 2. Sync Playlists
            const { data: cloudPlaylists, error: pleError } = await supabase
                .from('playlists')
                .select('*')
                .eq('user_id', user.id);

            if (!pleError && cloudPlaylists) {
                const playlists = cloudPlaylists.map(p => ({
                    id: p.id,
                    name: p.name,
                    songs: p.songs_data as Song[]
                }));
                dispatch(setPlaylists(playlists));
            }
        } catch (error) {
            console.error('Error syncing library:', error);
        }
    }
);

export const uploadFavorite = createAsyncThunk(
    'library/uploadFavorite',
    async (song: Song, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase.from('favorites').upsert({
            user_id: user.id,
            song_id: song.id,
            song_data: song
        });
    }
);

export const removeFavoriteCloud = createAsyncThunk(
    'library/removeFavorite',
    async (songId: string, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase.from('favorites').delete().eq('user_id', user.id).eq('song_id', songId);
    }
);

export const savePlaylistCloud = createAsyncThunk(
    'library/savePlaylist',
    async (playlist: { id: string; name: string; songs: Song[] }, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase.from('playlists').upsert({
            id: playlist.id,
            user_id: user.id,
            name: playlist.name,
            songs_data: playlist.songs
        });
    }
);

export const deletePlaylistCloud = createAsyncThunk(
    'library/deletePlaylist',
    async (playlistId: string, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase.from('playlists').delete().eq('user_id', user.id).eq('id', playlistId);
    }
);
