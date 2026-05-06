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
            state.songs = action.payload.slice(0, 100);
        },
        setSearchedSongs: (state, action: PayloadAction<Song[]>) => {
            state.searchedSongs = action.payload;
        },
        playMusic: (state, action: PayloadAction<any>) => {
            const song = action.payload;
            const id = song.id;

            // Toggle play/pause if current song is clicked again
            if (state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                // If a new song is played
                state.currentSong = {
                    ...song,
                    image: Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image,
                    downloadUrl: song.downloadUrl || song.music,
                } as Song;
                state.isPlaying = true;

                // Add to recently played
                state.recentlyPlayed = [
                    state.currentSong,
                    ...state.recentlyPlayed.filter((s) => s.id !== id),
                ].slice(0, 20);

                // Also ensure it's in the current playlist if not already there
                if (!state.songs.find(s => s.id === id)) {
                    state.songs = [state.currentSong, ...state.songs].slice(0, 100);
                }
            }
        },
        pauseMusic: (state) => {
            state.isPlaying = false;
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
            } else if (state.sleepTimer === 0) {
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
