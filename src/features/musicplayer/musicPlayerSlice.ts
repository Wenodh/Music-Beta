import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song, MusicPlayerState } from '../../types/music';

const initialState: MusicPlayerState = {
    songs: [],
    isPlaying: false,
    currentSong: null,
    searchedSongs: [],
    recentlyPlayed: [],
    sleepTimer: null,
};

const musicPlayerSlice = createSlice({
    name: 'musicPlayer',
    initialState,
    reducers: {
        setSongs: (state, action: PayloadAction<Song[]>) => {
            state.songs = [...action.payload, ...state.songs].slice(0, 100);
        },
        setSearchedSongs: (state, action: PayloadAction<Song[]>) => {
            state.searchedSongs = action.payload;
        },
        playMusic: (state, action: PayloadAction<any>) => {
            const {
                music,
                name,
                duration,
                image,
                id,
                primaryArtists,
                albumId,
            } = action.payload;

            // Toggle play/pause if current song is clicked again
            if (state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                // If a new song is played
                state.currentSong = {
                    name,
                    duration,
                    image: Array.isArray(image) ? image[image.length - 1]?.url : image,
                    id,
                    music,
                    downloadUrl: music,
                    primaryArtists,
                    albumId,
                } as Song;
                state.isPlaying = true;
            }
            // Add song to recently played, limiting to 20 songs
            const updatedRecentlyPlayed = [
                {
                    name,
                    duration,
                    image,
                    id,
                    downloadUrl: music,
                    primaryArtists,
                    albumId,
                },
                ...(state.recentlyPlayed?.filter((song) => song.id !== id) || []),
            ].slice(0, 20);

            state.recentlyPlayed = updatedRecentlyPlayed as Song[];
        },
        pauseMusic: (state) => {
            if (state.currentSong) {
                state.isPlaying = false;
            }
        },
        setCurrentSong: (state, action: PayloadAction<any>) => {
            state.currentSong = action.payload;
        },
        setSleepTimer: (state, action: PayloadAction<number | null>) => {
            state.sleepTimer = action.payload;
        },
        decrementSleepTimer: (state) => {
            if (state.sleepTimer && state.sleepTimer > 0) {
                state.sleepTimer -= 1;
            } else {
                state.sleepTimer = null;
                state.isPlaying = false;
            }
        },
    },
});

export const {
    setSongs,
    setSearchedSongs,
    playMusic,
    pauseMusic,
    setCurrentSong,
    setSleepTimer,
    decrementSleepTimer,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
