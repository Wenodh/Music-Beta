import { describe, it, expect } from 'vitest';
import { setSettingsOpen, setQueueOpen } from '../musicPlayerSlice';
import { store } from '../../../store';

describe('App Startup & Drawer Persistence Verification', () => {
    it('1. Initializes store with isSettingsOpen: false and isQueueOpen: false', () => {
        const state = store.getState().musicPlayer;
        expect(state.isSettingsOpen).toBe(false);
        expect(state.isQueueOpen).toBe(false);
    });

    it('2. Supports normal in-session opening and closing of both drawers', () => {
        store.dispatch(setSettingsOpen(true));
        expect(store.getState().musicPlayer.isSettingsOpen).toBe(true);

        store.dispatch(setSettingsOpen(false));
        expect(store.getState().musicPlayer.isSettingsOpen).toBe(false);

        store.dispatch(setQueueOpen(true));
        expect(store.getState().musicPlayer.isQueueOpen).toBe(true);

        store.dispatch(setQueueOpen(false));
        expect(store.getState().musicPlayer.isQueueOpen).toBe(false);
    });

    it('3. Rehydration action resets isSettingsOpen and isQueueOpen to false even if incoming persisted payload had them true', () => {
        // Dispatch rehydrate with open drawers and valid music player state
        store.dispatch({
            type: 'persist/REHYDRATE',
            key: 'root',
            payload: {
                musicPlayer: {
                    isSettingsOpen: true,
                    isQueueOpen: true,
                    volume: 0.85,
                    preferredQuality: '320kbps',
                },
            },
        });

        const state = store.getState().musicPlayer;
        expect(state.isSettingsOpen).toBe(false);
        expect(state.isQueueOpen).toBe(false);
        // Persisted preferences like volume & preferredQuality are preserved
        expect(state.volume).toBe(0.85);
        expect(state.preferredQuality).toBe('320kbps');
    });
});
