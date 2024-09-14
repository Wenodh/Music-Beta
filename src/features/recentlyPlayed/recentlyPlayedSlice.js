import { createSlice } from '@reduxjs/toolkit';

const recentlyPlayedSlice = createSlice({
    name: 'recentlyPlayed',
    initialState: [],
    reducers: {
        addSong: (state, action) => {
            const newSong = action.payload;

            // Check if the song already exists in the list
            const existingSongIndex = state.findIndex(song => song.id === newSong.id);

            // Remove the song if it exists to move it to the front
            if (existingSongIndex > -1) {
                state.splice(existingSongIndex, 1);
            }

            // Add the new song to the beginning
            state.unshift(newSong);

            // Limit the list to 20 songs
            if (state.length > 20) {
                state.pop();
            }
        },
        clearRecentlyPlayed: (state) => {
            return [];
        }
    },
});

export const { addSong, clearRecentlyPlayed } = recentlyPlayedSlice.actions;
export default recentlyPlayedSlice.reducer;
