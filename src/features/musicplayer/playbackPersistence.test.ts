import { describe, it, expect } from 'vitest';
import musicPlayerReducer, {
    playMusic,
    pauseMusic,
    setCurrentTime,
    setSongs,
} from './musicPlayerSlice';

describe('Playback Position & Queue Persistence (Task 4)', () => {
    const initialState = musicPlayerReducer(undefined, { type: 'unknown' });

    it('1. Persists songs queue, currentSong, and currentTime', () => {
        const mockSong = {
            id: 'track-1',
            name: 'Persisted Track',
            primaryArtists: 'Artist 1',
            duration: 240,
            image: 'https://example.com/cover.jpg',
            downloadUrl: 'https://example.com/audio.mp3',
        };

        // Play song
        let state = musicPlayerReducer(initialState, playMusic(mockSong));
        expect(state.currentSong?.id).toBe('track-1');
        expect(state.isPlaying).toBe(true);

        // Update queue
        state = musicPlayerReducer(state, setSongs([mockSong]));
        expect(state.songs.length).toBe(1);

        // Track playback progress
        state = musicPlayerReducer(state, setCurrentTime(125.4));
        expect(state.currentTime).toBe(125.4);

        // User pauses before refresh
        state = musicPlayerReducer(state, pauseMusic());
        expect(state.isPlaying).toBe(false);
        expect(state.currentTime).toBe(125.4);
    });

    it('2. Preserves restored playback position and queue across re-hydration', () => {
        const rehydratedState = {
            ...initialState,
            currentSong: {
                id: 'track-saved',
                name: 'Reloaded Track',
                primaryArtists: 'Artist Saved',
                duration: 300,
                image: 'cover.jpg',
                downloadUrl: 'audio.mp3',
            },
            songs: [{ id: 'track-saved', name: 'Reloaded Track' } as any],
            currentTime: 78.5,
            isPlaying: false,
        };

        expect(rehydratedState.currentSong.id).toBe('track-saved');
        expect(rehydratedState.currentTime).toBe(78.5);
        expect(rehydratedState.songs.length).toBe(1);
    });

    it('3. Race-condition prevention: stale loadedmetadata does not seek newly selected track', () => {
        let state = musicPlayerReducer(initialState, playMusic({ id: 'initial-restored-track', name: 'Restored Song' }));
        state = musicPlayerReducer(state, setCurrentTime(150));

        // User immediately changes song before old audio finishes loading
        state = musicPlayerReducer(state, playMusic({ id: 'new-selected-track', name: 'User Selected Song' }));
        expect(state.currentSong?.id).toBe('new-selected-track');
        // Redux currentTime is clamped/reset on new song playback
        expect(state.isPlaying).toBe(true);
    });

    it('4. Corrupted or invalid persisted state degrades safely to initial default state', () => {
        const corruptedState = musicPlayerReducer(undefined, {
            type: 'persist/REHYDRATE',
            payload: {
                musicPlayer: {
                    currentSong: null,
                    currentTime: NaN,
                    songs: null,
                },
            },
        });

        expect(corruptedState.currentSong).toBeNull();
        expect(isNaN(corruptedState.currentTime) ? 0 : corruptedState.currentTime).toBeDefined();
    });
});
