import { describe, it, expect } from 'vitest';
import uiReducer, { setOledMode, setAccentColor } from './uiSlice';

describe('uiSlice reducer', () => {
    const initialState = {
        toasts: [],
        playlistModal: {
            isOpen: false,
            song: null,
        },
        isEqualizerOpen: false,
        isLyricsOpen: false,
        theme: {
            accentColor: '#ef4444',
            isOled: false,
            darkMode: false,
        },
    };

    it('should handle setOledMode and enable darkMode', () => {
        const actual = uiReducer(initialState, setOledMode(true));
        expect(actual.theme.isOled).toBe(true);
        expect(actual.theme.darkMode).toBe(true);
    });

    it('should handle setAccentColor', () => {
        const newColor = '#00ff00';
        const actual = uiReducer(initialState, setAccentColor(newColor));
        expect(actual.theme.accentColor).toBe(newColor);
    });
});
