import { createSlice } from '@reduxjs/toolkit';

const musicPlayerSlice = createSlice({
    name: 'musicPlayer',
    initialState: {
        songs: [],
        isPlaying: false,
        currentSong: null,
        searchedSongs: [],
        recentlyPlayed: [],
    },
    reducers: {
        setSongs: (state, action) => {
            state.songs = [...action.payload, ...state.songs].slice(0, 100);
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

            // Toggle play/pause if current song is clicked again
            if (state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                // If a new song is played
                state.currentSong = {
                    name,
                    duration,
                    image: image?.[2]?.url,
                    id,
                    music,
                    primaryArtists,
                    albumId,
                };
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
                ...state?.recentlyPlayed?.filter((song) => song.id !== id),
            ]?.slice(0, 20);

            state.recentlyPlayed = updatedRecentlyPlayed;
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
    pauseMusic,
    setCurrentSong,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
