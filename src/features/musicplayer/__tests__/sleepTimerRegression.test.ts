import { describe, it, expect } from 'vitest';
import musicPlayerReducer, {
    playMusic,
    nextSong,
    prevSong,
    setSleepTimer,
} from '../../../features/musicplayer/musicPlayerSlice';
import { Song } from '../../../types/music';

const createMockSong = (id: string, name: string): Song => ({
    id,
    name,
    title: name,
    artist: 'Artist',
    primaryArtists: 'Artist',
    album: { id: 'album-1', name: 'Album' },
    year: '2026',
    duration: 200,
    label: 'Label',
    language: 'English',
    genre: 'Pop',
    image: [{ quality: '500x500', url: 'https://example.com/img.jpg' }],
    downloadUrl: [{ quality: '320kbps', url: 'https://example.com/audio.mp3' }],
});

describe('Phase 1 & Phase 2 Regression Tests - Sleep Timer & Player State', () => {
    it('clears endOfTrack sleep timer when a user manually starts playing a different song (VIBE-BUG-002)', () => {
        const song1 = createMockSong('s1', 'Song 1');
        const song2 = createMockSong('s2', 'Song 2');

        let state = musicPlayerReducer(undefined, playMusic(song1));
        state = musicPlayerReducer(state, setSleepTimer({ time: null, mode: 'endOfTrack' }));
        expect(state.sleepTimerMode).toBe('endOfTrack');

        // Manually play song 2
        state = musicPlayerReducer(state, playMusic(song2));
        expect(state.currentSong?.id).toBe('s2');
        expect(state.sleepTimerMode).toBeNull();
        expect(state.sleepTimer).toBeNull();
    });

    it('clears endOfTrack sleep timer when a user manually skips to next or previous song (VIBE-BUG-002)', () => {
        const song1 = createMockSong('s1', 'Song 1');
        const song2 = createMockSong('s2', 'Song 2');

        let state = musicPlayerReducer(undefined, playMusic(song1));
        state = musicPlayerReducer(state, playMusic(song2));
        state = musicPlayerReducer(state, setSleepTimer({ time: null, mode: 'endOfTrack' }));
        expect(state.sleepTimerMode).toBe('endOfTrack');

        // Manual skip to next
        state = musicPlayerReducer(state, nextSong({ isManual: true }));
        expect(state.sleepTimerMode).toBeNull();
        expect(state.sleepTimer).toBeNull();

        // Re-arm and skip previous
        state = musicPlayerReducer(state, setSleepTimer({ time: null, mode: 'endOfTrack' }));
        expect(state.sleepTimerMode).toBe('endOfTrack');
        state = musicPlayerReducer(state, prevSong());
        expect(state.sleepTimerMode).toBeNull();
        expect(state.sleepTimer).toBeNull();
    });
});
