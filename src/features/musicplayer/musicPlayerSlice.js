import { createSlice } from '@reduxjs/toolkit';

const musicPlayerSlice = createSlice({
    name: 'musicPlayer',
    initialState: {
        songs: [],
        isPlaying: false,
        currentSong: null,
        searchedSongs: [],
    },
    reducers: {
        setSongs: (state, action) => {
            state.songs = action.payload;
        },
        setSearchedSongs: (state, action) => {
            state.searchedSongs = action.payload;
        },
        playMusic: (state, action) => {
            const {
                music,
                name,
                duration,
                image,
                id,
                primaryArtists,
                albumId,
            } = action.payload;
            if (state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                if (state.currentSong) {
                    state.isPlaying = false;
                }
                state.currentSong = {
                    name,
                    duration,
                    image: image[2].url,
                    id,
                    music,
                    primaryArtists,
                    albumId,
                };
                state.isPlaying = true;
            }
        },
        pauseMusic: (state) => {
            if (state.currentSong) {
                state.isPlaying = false;
            }
        },
        setCurrentSong: (state, action) => {
            state.currentSong = action.payload;
        },
    },
});

export const {
    setSongs,
    setSearchedSongs,
    playMusic,
    nextSong,
    prevSong,
    setCurrentSong,
    pauseMusic,
} = musicPlayerSlice.actions;
export default musicPlayerSlice.reducer;
