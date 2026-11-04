import { describe, it, expect } from 'vitest';
import reducer, {
    setPlaybackSpeed,
    setSleepTimer,
    decrementSleepTimer,
    playNextInQueue,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playMusic,
} from '../musicPlayerSlice';
import { Song, MusicPlayerState } from '../../../types/music';

const mockSong1: Song = {
    id: 'song-1',
    name: 'Song One',
    duration: 210,
    image: 'https://example.com/art1.jpg',
    downloadUrl: 'https://example.com/song1.mp3',
    primaryArtists: 'Artist A',
};

const mockSong2: Song = {
    id: 'song-2',
    name: 'Song Two',
    duration: 180,
    image: 'https://example.com/art2.jpg',
    downloadUrl: 'https://example.com/song2.mp3',
    primaryArtists: 'Artist B',
};

const mockSong3: Song = {
    id: 'song-3',
    name: 'Song Three',
    duration: 240,
    image: 'https://example.com/art3.jpg',
    downloadUrl: 'https://example.com/song3.mp3',
    primaryArtists: 'Artist C',
};

describe('Sprint 3.1: Player Experience & Queue Reducer Tests', () => {
    const initialState: MusicPlayerState = {
        songs: [mockSong1, mockSong2],
        recommendations: [],
        isPlaying: false,
        currentSong: mockSong1,
        searchedSongs: [],
        isSearching: false,
        searchError: null,
        searchQuery: '',
        recentlyPlayed: [],
        recentlyPlayedAlbums: [],
        sleepTimer: null,
        sleepTimerMode: null,
        preferredQuality: '320kbps',
        isSettingsOpen: false,
        isQueueOpen: false,
        equalizerSettings: { enabled: false, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], preset: 'Normal' },
        isGaplessEnabled: false,
        crossfadeDuration: 5,
        currentTime: 0,
        isSongRadioEnabled: true,
        downloadSettings: { wifiOnly: false, maxConcurrency: 3 },
        dailyMix: [],
        lastDailyMixUpdate: 0,
        recommendationsCache: {},
        visualizerStyle: 'bars',
        repeatMode: 'none',
        shuffle: false,
        playbackSpeed: 1.0,
    };

    it('sets playback speed to valid values', () => {
        const state1 = reducer(initialState, setPlaybackSpeed(1.5));
        expect(state1.playbackSpeed).toBe(1.5);

        const state2 = reducer(state1, setPlaybackSpeed(0.75));
        expect(state2.playbackSpeed).toBe(0.75);
    });

    it('handles sleep timer duration mode and decrementing', () => {
        const stateWithTimer = reducer(initialState, setSleepTimer({ time: 5, mode: 'duration' }));
        expect(stateWithTimer.sleepTimer).toBe(5);
        expect(stateWithTimer.sleepTimerMode).toBe('duration');

        const decremented = reducer(stateWithTimer, decrementSleepTimer());
        expect(decremented.sleepTimer).toBe(4);

        // When timer hits 1 and decrements, stops playing and clears timer
        const timerAt1 = { ...stateWithTimer, sleepTimer: 1, isPlaying: true };
        const stoppedState = reducer(timerAt1, decrementSleepTimer());
        expect(stoppedState.sleepTimer).toBeNull();
        expect(stoppedState.sleepTimerMode).toBeNull();
        expect(stoppedState.isPlaying).toBe(false);
    });

    it('handles sleep timer "end of track" mode', () => {
        const stateEndOfTrack = reducer(initialState, setSleepTimer({ time: -1, mode: 'endOfTrack' }));
        expect(stateEndOfTrack.sleepTimer).toBe(-1);
        expect(stateEndOfTrack.sleepTimerMode).toBe('endOfTrack');

        // Decrement should not affect endOfTrack mode
        const decremented = reducer(stateEndOfTrack, decrementSleepTimer());
        expect(decremented.sleepTimer).toBe(-1);
        expect(decremented.sleepTimerMode).toBe('endOfTrack');
    });

    it('plays next in queue inserting right after current song', () => {
        // Current is mockSong1, queue has [mockSong1, mockSong2]
        const state = reducer(initialState, playNextInQueue(mockSong3));
        expect(state.songs.map(s => s.id)).toEqual(['song-1', 'song-3', 'song-2']);
    });

    it('removes duplicate when playNextInQueue is called for existing song', () => {
        // queue has [mockSong1, mockSong2, mockSong3]
        const stateWith3 = { ...initialState, songs: [mockSong1, mockSong2, mockSong3] };
        // Insert mockSong3 next
        const nextState = reducer(stateWith3, playNextInQueue(mockSong3));
        expect(nextState.songs.map(s => s.id)).toEqual(['song-1', 'song-3', 'song-2']);
    });

    it('clears queue keeping only currently playing track', () => {
        const state = reducer(initialState, clearQueue());
        expect(state.songs.length).toBe(1);
        expect(state.songs[0].id).toBe('song-1');
    });
});
