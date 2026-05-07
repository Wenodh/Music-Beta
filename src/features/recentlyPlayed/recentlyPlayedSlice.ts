import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';

interface RecentlyPlayedState {
    recentlyPlayed: Song[];
}

const initialState: RecentlyPlayedState = {
    recentlyPlayed: [],
};

const recentlyPlayedSlice = createSlice({
    name: 'recentlyPlayed',
    initialState,
    reducers: {
        setRecentlyPlayed: (state, action: PayloadAction<Song>) => {
            state.recentlyPlayed = [
                action.payload,
                ...state.recentlyPlayed.filter(
                    (song) => song.id !== action.payload.id
                ),
            ].slice(0, 20);
        },
    },
});

export const { setRecentlyPlayed } = recentlyPlayedSlice.actions;

export default recentlyPlayedSlice.reducer;
