import { createSlice } from '@reduxjs/toolkit';

const recentlyPlayedSlice = createSlice({
    name: 'recentlyPlayed',
    initialState: JSON.parse(localStorage.getItem('recentlyPlayed')) || [],
    reducers: {
        addSong: (state, action) => {
            const newSong = action.payload;
            const updatedState = [newSong, ...state.filter(song => song.id !== newSong.id)].slice(0, 10); // Limit to 10 songs
            return updatedState;
        },
    },
});

export const { addSong } = recentlyPlayedSlice.actions;
export default recentlyPlayedSlice.reducer;
