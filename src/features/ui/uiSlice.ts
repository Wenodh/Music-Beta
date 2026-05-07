import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface UIState {
    toasts: Toast[];
    playlistModal: {
        isOpen: boolean;
        song: Song | null;
    };
}

const initialState: UIState = {
    toasts: [],
    playlistModal: {
        isOpen: false,
        song: null,
    },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        showToast: (state, action: PayloadAction<{ message: string; type?: Toast['type'] }>) => {
            state.toasts.push({
                id: Date.now().toString(),
                message: action.payload.message,
                type: action.payload.type || 'success',
            });
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter((t) => t.id !== action.payload);
        },
        openPlaylistModal: (state, action: PayloadAction<Song>) => {
            state.playlistModal.isOpen = true;
            state.playlistModal.song = action.payload;
        },
        closePlaylistModal: (state) => {
            state.playlistModal.isOpen = false;
            state.playlistModal.song = null;
        },
    },
});

export const { showToast, removeToast, openPlaylistModal, closePlaylistModal } = uiSlice.actions;
export default uiSlice.reducer;
