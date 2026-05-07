import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import { Song } from '../../types/music';
import { RootState } from '../../store';
import { setFavorites, setPlaylists } from './librarySlice';

export const syncLibrary = createAsyncThunk(
    'library/sync',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        try {
            // 1. Sync Favorites (Merge approach)
            const { data: cloudFavs } = await supabase
                .from('favorites')
                .select('song_id, song_data')
                .eq('user_id', user.id);

            const localFavs = state.library.favorites;
            const cloudFavIds = new Set((cloudFavs || []).map(f => f.song_id));

            // Upload local favorites that aren't in cloud
            const toUploadFavs = localFavs
                .filter(song => !cloudFavIds.has(song.id))
                .map(song => ({
                    user_id: user.id,
                    song_id: song.id,
                    song_data: song
                }));

            if (toUploadFavs.length > 0) {
                await supabase.from('favorites').insert(toUploadFavs);
            }

            // Refresh local state with merged data
            const { data: finalFavs } = await supabase
                .from('favorites')
                .select('song_data')
                .eq('user_id', user.id);

            if (finalFavs) {
                dispatch(setFavorites(finalFavs.map(f => f.song_data as Song)));
            }

            // 2. Sync Playlists
            const { data: cloudPlaylists } = await supabase
                .from('playlists')
                .select('*')
                .eq('user_id', user.id);

            const localPlaylists = state.library.playlists;

            // Simple merge: if cloud has playlists, we fetch them.
            // If local has playlists that aren't in cloud (matching by name for guest migration), upload them.
            const cloudPlaylistNames = new Set((cloudPlaylists || []).map(p => p.name));
            const toUploadPlaylists = localPlaylists
                .filter(p => !cloudPlaylistNames.has(p.name))
                .map(p => ({
                    user_id: user.id,
                    name: p.name,
                    songs_data: p.songs
                }));

            if (toUploadPlaylists.length > 0) {
                await supabase.from('playlists').insert(toUploadPlaylists);
            }

            // Refresh local state with final cloud playlists (which now have proper UUIDs)
            const { data: finalPlaylists } = await supabase
                .from('playlists')
                .select('*')
                .eq('user_id', user.id);

            if (finalPlaylists) {
                dispatch(setPlaylists(finalPlaylists.map(p => ({
                    id: p.id,
                    name: p.name,
                    songs: p.songs_data as Song[]
                }))));
            }
        } catch (error) {
            console.error('Error syncing library:', error);
        }
    }
);

export const toggleCloudFavorite = createAsyncThunk(
    'library/toggleFavorite',
    async (song: Song, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        // We check the database directly or use a "upsert/delete" logic that doesn't depend on the current (possibly outdated) local state
        const { data } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('song_id', song.id)
            .single();

        if (data) {
            await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('song_id', song.id);
        } else {
            await supabase
                .from('favorites')
                .insert({
                    user_id: user.id,
                    song_id: song.id,
                    song_data: song
                });
        }
    }
);

export const createCloudPlaylist = createAsyncThunk(
    'library/createPlaylist',
    async (payload: { name: string, song?: Song }, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        const { data, error } = await supabase
            .from('playlists')
            .insert({
                user_id: user.id,
                name: payload.name,
                songs_data: payload.song ? [payload.song] : []
            })
            .select()
            .single();

        if (data && !error) {
            // Update local state with the actual cloud ID
            dispatch(setPlaylists([...state.library.playlists, {
                id: data.id,
                name: data.name,
                songs: data.songs_data as Song[]
            }]));
        }
    }
);

export const deleteCloudPlaylist = createAsyncThunk(
    'library/deletePlaylist',
    async (playlistId: string, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase
            .from('playlists')
            .delete()
            .eq('id', playlistId)
            .eq('user_id', user.id);
    }
);

export const addToCloudPlaylist = createAsyncThunk(
    'library/addToPlaylist',
    async (payload: { playlistId: string, song: Song }, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        // Fetch the latest playlist state from cloud to avoid duplicates and state mismatch
        const { data: playlist } = await supabase
            .from('playlists')
            .select('songs_data')
            .eq('id', payload.playlistId)
            .eq('user_id', user.id)
            .single();

        if (playlist) {
            const currentSongs = playlist.songs_data as Song[];
            if (!currentSongs.find(s => s.id === payload.song.id)) {
                const updatedSongs = [...currentSongs, payload.song];
                await supabase
                    .from('playlists')
                    .update({ songs_data: updatedSongs })
                    .eq('id', payload.playlistId)
                    .eq('user_id', user.id);
            }
        }
    }
);

export const removeFromCloudPlaylist = createAsyncThunk(
    'library/removeFromPlaylist',
    async (payload: { playlistId: string, songId: string }, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        const { data: playlist } = await supabase
            .from('playlists')
            .select('songs_data')
            .eq('id', payload.playlistId)
            .eq('user_id', user.id)
            .single();

        if (playlist) {
            const currentSongs = playlist.songs_data as Song[];
            const updatedSongs = currentSongs.filter(s => s.id !== payload.songId);
            await supabase
                .from('playlists')
                .update({ songs_data: updatedSongs })
                .eq('id', payload.playlistId)
                .eq('user_id', user.id);
        }
    }
);
