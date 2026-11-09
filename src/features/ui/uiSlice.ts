import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';
import { DEFAULT_VISIBLE_NAV_IDS } from '../../constants/navigation';

export type MobileNavPosition = 'bottom' | 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
    createdAt?: number;
}

const DEDUPLICATION_WINDOW_MS = 2500;

interface UIState {
    toasts: Toast[];
    lastToastHistory: Record<string, number>;
    playlistModal: {
        isOpen: boolean;
        song: Song | null;
        bulkSongs?: Song[];
    };
    isEqualizerOpen: boolean;
    isLyricsOpen: boolean;
    isPlayerExpanded: boolean;
    isSessionModalOpen: boolean;
    isImportExportModalOpen: boolean;
    theme: {
        accentColor: string;
        isOled: boolean;
        darkMode: boolean;
        fontStyle: string;
    };
    mobileNavItems: string[];
    mobileNavPosition: MobileNavPosition;
    settingsUpdatedAt: number;
    protectIpInCalls: boolean;
    isNavSettingsViewing: boolean;
}

const initialState: UIState = {
    toasts: [],
    lastToastHistory: {},
    playlistModal: {
        isOpen: false,
        song: null,
    },
    isEqualizerOpen: false,
    isLyricsOpen: false,
    isPlayerExpanded: false,
    isSessionModalOpen: false,
    isImportExportModalOpen: false,
    theme: {
        accentColor: '#ef4444', // Default red-500
        isOled: false,
        darkMode: true,
        fontStyle: 'Standard',
    },
    mobileNavItems: DEFAULT_VISIBLE_NAV_IDS,
    mobileNavPosition: 'bottom',
    settingsUpdatedAt: 0,
    protectIpInCalls: false,
    isNavSettingsViewing: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        showToast: (state, action: PayloadAction<{ message: string; type?: Toast['type']; duration?: number }>) => {
            const now = Date.now();
            const message = action.payload.message;
            const type = action.payload.type || 'success';
            const duration = action.payload.duration ?? 3000;
            const key = `${type}:${message.trim()}`;

            // Check if identical toast was dispatched within the deduplication window
            const lastDispatched = state.lastToastHistory[key];
            if (lastDispatched && (now - lastDispatched < DEDUPLICATION_WINDOW_MS)) {
                return; // Suppress duplicate toast
            }

            // Record timestamp for deduplication
            state.lastToastHistory[key] = now;

            state.toasts.push({
                id: `${now}-${Math.random().toString(36).substring(2, 6)}`,
                message,
                type,
                duration,
                createdAt: now,
            });
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter((t) => t.id !== action.payload);
        },
        clearAllToasts: (state) => {
            state.toasts = [];
        },
        openPlaylistModal: (state, action: PayloadAction<Song | Song[]>) => {
            state.playlistModal.isOpen = true;
            if (Array.isArray(action.payload)) {
                state.playlistModal.bulkSongs = action.payload;
                state.playlistModal.song = action.payload[0] || null;
            } else {
                state.playlistModal.song = action.payload;
                state.playlistModal.bulkSongs = undefined;
            }
        },
        closePlaylistModal: (state) => {
            state.playlistModal.isOpen = false;
            state.playlistModal.song = null;
            state.playlistModal.bulkSongs = undefined;
        },
        setEqualizerOpen: (state, action: PayloadAction<boolean>) => {
            state.isEqualizerOpen = action.payload;
        },
        setLyricsOpen: (state, action: PayloadAction<boolean>) => {
            state.isLyricsOpen = action.payload;
        },
        setPlayerExpanded: (state, action: PayloadAction<boolean>) => {
            state.isPlayerExpanded = action.payload;
        },
        setSessionModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isSessionModalOpen = action.payload;
        },
        setImportExportModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isImportExportModalOpen = action.payload;
        },
        setAccentColor: (state, action: PayloadAction<string>) => {
            state.theme.accentColor = action.payload;
        },
        setOledMode: (state, action: PayloadAction<boolean>) => {
            state.theme.isOled = action.payload;
            if (action.payload) {
                state.theme.darkMode = true;
            }
        },
        setDarkMode: (state, action: PayloadAction<boolean>) => {
            state.theme.darkMode = action.payload;
            if (!action.payload) {
                state.theme.isOled = false;
            }
        },
        setFontStyle: (state, action: PayloadAction<string>) => {
            state.theme.fontStyle = action.payload;
        },
        applyThemeSettings: (state, action: PayloadAction<UIState['theme']>) => {
            state.theme = { ...state.theme, ...action.payload };
        },
        setMobileNavItems: (state, action: PayloadAction<string[]>) => {
            // Guarantee 'home' is always present in list, while preserving user custom order
            const hasHome = action.payload.includes('home');
            const items = Array.from(new Set(hasHome ? action.payload : ['home', ...action.payload]));
            state.mobileNavItems = items;
        },
        resetMobileNavItems: (state) => {
            state.mobileNavItems = DEFAULT_VISIBLE_NAV_IDS;
        },
        setMobileNavPosition: (state, action: PayloadAction<MobileNavPosition>) => {
            state.mobileNavPosition = action.payload;
        },
        updateSettingsTimestamp: (state) => {
            state.settingsUpdatedAt = Date.now();
        },
        setSettingsUpdatedAt: (state, action: PayloadAction<number>) => {
            state.settingsUpdatedAt = action.payload;
        },
        resetSettingsTimestamp: (state) => {
            state.settingsUpdatedAt = 0;
        },
        setProtectIpInCalls: (state, action: PayloadAction<boolean>) => {
            state.protectIpInCalls = action.payload;
        },
        setIsNavSettingsViewing: (state, action: PayloadAction<boolean>) => {
            state.isNavSettingsViewing = action.payload;
        },
    },
});

export const {
    showToast,
    removeToast,
    clearAllToasts,
    openPlaylistModal,
    closePlaylistModal,
    setEqualizerOpen,
    setLyricsOpen,
    setPlayerExpanded,
    setSessionModalOpen,
    setImportExportModalOpen,
    setAccentColor,
    setOledMode,
    setDarkMode,
    setFontStyle,
    applyThemeSettings,
    setMobileNavItems,
    resetMobileNavItems,
    setMobileNavPosition,
    updateSettingsTimestamp,
    setSettingsUpdatedAt,
    resetSettingsTimestamp,
    setProtectIpInCalls,
    setIsNavSettingsViewing,
} = uiSlice.actions;
export default uiSlice.reducer;
