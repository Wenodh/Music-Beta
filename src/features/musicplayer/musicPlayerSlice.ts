import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song, MusicPlayerState } from '../../types/music';
import { getNextSong, getPrevSong } from '../../utils/playlist';

const initialState: MusicPlayerState = {
    songs: [],
    recommendations: [],
    isPlaying: false,
    currentSong: null,
    searchedSongs: [],
    isSearching: false,
    searchError: null,
    searchQuery: '',
    recentlyPlayed: [],
    recentlyPlayedAlbums: [],
    sleepTimer: null,
    preferredQuality: '320kbps',
    isSettingsOpen: false,
    isQueueOpen: false,
    equalizerSettings: {
        enabled: false,
        bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        preset: 'Normal',
    },
    isGaplessEnabled: false,
    crossfadeDuration: 5,
    currentTime: 0,
    isSongRadioEnabled: true,
    downloadSettings: {
        wifiOnly: false,
        maxConcurrency: 3,
    },
    dailyMix: [],
    lastDailyMixUpdate: 0,
    recommendationsCache: {},
    visualizerStyle: 'bars',
    repeatMode: 'none',
    shuffle: false,
    playbackSpeed: 1.0,
    sleepTimerMode: null,
    volume: 0.7,
    isMuted: false,
    previousVolume: 0.7,
};

// Helper to format song for currentSong state
const formatSong = (song: Song | any, preferredQuality: string): Song => {
    const downloadUrl = song.downloadUrl || song.music;
    let musicUrl = downloadUrl;
    if (Array.isArray(downloadUrl)) {
        musicUrl = downloadUrl.find((d: any) => d.quality === preferredQuality)?.url ||
                   downloadUrl[downloadUrl.length - 1]?.url;
    }

    return {
        ...song,
        type: 'song',
        image: Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image,
        downloadUrl: downloadUrl,
        music: musicUrl,
    } as Song;
};

const musicPlayerSlice = createSlice({
    name: 'musicPlayer',
    initialState,
    reducers: {
        setSongs: (state, action: PayloadAction<Song[]>) => {
            state.songs = action.payload.slice(0, 100);
        },
        setSearchedSongs: (state, action: PayloadAction<any>) => {
            state.searchedSongs = action.payload;
        },
        setIsSearching: (state, action: PayloadAction<boolean>) => {
            state.isSearching = action.payload;
        },
        setSearchError: (state, action: PayloadAction<string | null>) => {
            state.searchError = action.payload;
        },
        setSearchQueryState: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        playMusic: (state, action: PayloadAction<Song & { forcePlay?: boolean } | any>) => {
            const { forcePlay, ...songData } = action.payload;
            const id = songData.id;

            // VIBE-BUG-002: Reset endOfTrack sleep timer when track changes
            if (state.sleepTimerMode === 'endOfTrack' && state.currentSong?.id !== id) {
                state.sleepTimer = null;
                state.sleepTimerMode = null;
            }

            // Toggle play/pause if current song is clicked again (unless forcePlay is true)
            if (!forcePlay && state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                state.currentSong = formatSong(songData, state.preferredQuality);
                state.isPlaying = true;

                // Add to recently played
                state.recentlyPlayed = [
                    state.currentSong,
                    ...state.recentlyPlayed.filter((s) => s.id !== id),
                ].slice(0, 20);

                // Also ensure it's in the current playlist if not already there
                if (!state.songs.find(s => s.id === id)) {
                    state.songs = [state.currentSong, ...state.songs].slice(0, 100);
                }
            }
        },
        pauseMusic: (state) => {
            state.isPlaying = false;
        },
        setCurrentSong: (state, action: PayloadAction<any>) => {
            state.currentSong = action.payload;
        },
        setSleepTimer: (state, action: PayloadAction<{ time: number | null; mode?: 'duration' | 'endOfTrack' } | number | null>) => {
            if (action.payload === null) {
                state.sleepTimer = null;
                state.sleepTimerMode = null;
            } else if (typeof action.payload === 'number') {
                state.sleepTimer = action.payload;
                state.sleepTimerMode = 'duration';
            } else {
                state.sleepTimer = action.payload.time;
                state.sleepTimerMode = action.payload.mode || (action.payload.time !== null ? 'duration' : null);
            }
        },
        decrementSleepTimer: (state) => {
            if (state.sleepTimer !== null && state.sleepTimerMode === 'duration') {
                if (state.sleepTimer > 1) {
                    state.sleepTimer -= 1;
                } else {
                    state.sleepTimer = null;
                    state.sleepTimerMode = null;
                    state.isPlaying = false;
                }
            }
        },
        setPlaybackSpeed: (state, action: PayloadAction<MusicPlayerState['playbackSpeed']>) => {
            state.playbackSpeed = action.payload;
        },
        addToQueue: (state, action: PayloadAction<Song>) => {
            if (!state.songs.find(s => s.id === action.payload.id)) {
                state.songs.push(action.payload);
            }
        },
        playNextInQueue: (state, action: PayloadAction<Song>) => {
            const song = action.payload;
            // Remove existing instance if present
            const filtered = state.songs.filter(s => s.id !== song.id);
            if (!state.currentSong) {
                state.songs = [song];
            } else {
                const currentIndex = filtered.findIndex(s => s.id === state.currentSong?.id);
                if (currentIndex !== -1) {
                    filtered.splice(currentIndex + 1, 0, song);
                    state.songs = filtered;
                } else {
                    state.songs = [state.currentSong, song, ...filtered];
                }
            }
        },
        removeFromQueue: (state, action: PayloadAction<string>) => {
            state.songs = state.songs.filter(s => s.id !== action.payload);
        },
        reorderQueue: (state, action: PayloadAction<Song[]>) => {
            state.songs = action.payload;
        },
        clearQueue: (state) => {
            state.songs = state.currentSong ? [state.currentSong] : [];
        },
        setRecommendations: (state, action: PayloadAction<{ songId: string; recommendations: Song[] }>) => {
            state.recommendations = action.payload.recommendations;
            state.recommendationsCache[action.payload.songId] = {
                songs: action.payload.recommendations,
                timestamp: Date.now(),
            };
        },
        addRecentlyPlayedAlbum: (state, action: PayloadAction<any>) => {
            const album = action.payload;
            state.recentlyPlayedAlbums = [
                { ...album, type: 'album' },
                ...state.recentlyPlayedAlbums.filter((a: any) => a.id !== album.id),
            ].slice(0, 20);
        },
        setPreferredQuality: (state, action: PayloadAction<MusicPlayerState['preferredQuality']>) => {
            state.preferredQuality = action.payload;
            if (state.currentSong) {
                const downloadUrl = state.currentSong.downloadUrl;
                if (Array.isArray(downloadUrl)) {
                    const newMusic = downloadUrl.find((d: any) => d.quality === action.payload)?.url ||
                                     downloadUrl[downloadUrl.length - 1]?.url;
                    state.currentSong.music = newMusic;
                }
            }
        },
        setSettingsOpen: (state, action: PayloadAction<boolean>) => {
            state.isSettingsOpen = action.payload;
            if (action.payload) {
                state.isQueueOpen = false;
            }
        },
        setQueueOpen: (state, action: PayloadAction<boolean>) => {
            state.isQueueOpen = action.payload;
            if (action.payload) {
                state.isSettingsOpen = false;
            }
        },
        setEqualizerEnabled: (state, action: PayloadAction<boolean>) => {
            state.equalizerSettings.enabled = action.payload;
        },
        setEqualizerBand: (state, action: PayloadAction<{ index: number; value: number }>) => {
            state.equalizerSettings.bands[action.payload.index] = action.payload.value;
            state.equalizerSettings.preset = 'Custom';
        },
        setEqualizerPreset: (state, action: PayloadAction<{ name: string; bands: number[] }>) => {
            state.equalizerSettings.preset = action.payload.name;
            state.equalizerSettings.bands = [...action.payload.bands];
        },
        setGaplessEnabled: (state, action: PayloadAction<boolean>) => {
            state.isGaplessEnabled = action.payload;
        },
        setCrossfadeDuration: (state, action: PayloadAction<number>) => {
            state.crossfadeDuration = action.payload;
        },
        setCurrentTime: (state, action: PayloadAction<number>) => {
            state.currentTime = action.payload;
        },
        setSongRadioEnabled: (state, action: PayloadAction<boolean>) => {
            state.isSongRadioEnabled = action.payload;
        },
        setWifiOnly: (state, action: PayloadAction<boolean>) => {
            state.downloadSettings.wifiOnly = action.payload;
        },
        setMaxConcurrency: (state, action: PayloadAction<number>) => {
            const clamped = Math.min(100, Math.max(1, Math.round(action.payload)));
            state.downloadSettings.maxConcurrency = clamped;
        },
        setDailyMix: (state, action: PayloadAction<{ songs: Song[]; timestamp: number }>) => {
            state.dailyMix = action.payload.songs;
            state.lastDailyMixUpdate = action.payload.timestamp;
        },
        setVisualizerStyle: (state, action: PayloadAction<MusicPlayerState['visualizerStyle']>) => {
            state.visualizerStyle = action.payload;
        },
        toggleRepeatMode: (state) => {
            const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
            const currentIndex = modes.indexOf(state.repeatMode);
            state.repeatMode = modes[(currentIndex + 1) % modes.length];
        },
        toggleShuffle: (state) => {
            state.shuffle = !state.shuffle;
        },
        nextSong: (state, action: PayloadAction<{ isManual?: boolean } | undefined>) => {
            const isManual = action.payload?.isManual ?? true;
            const next = getNextSong(state.currentSong, state.songs, state.shuffle, state.repeatMode, isManual);

            if (next) {
                state.currentSong = formatSong(next, state.preferredQuality);
                state.isPlaying = true;
                state.recentlyPlayed = [
                    state.currentSong,
                    ...state.recentlyPlayed.filter((s) => s.id !== state.currentSong?.id),
                ].slice(0, 20);
            } else {
                // End of queue logic (radio handled in component)
                state.isPlaying = false;
            }
        },
        prevSong: (state) => {
            const prev = getPrevSong(state.currentSong, state.songs, state.shuffle);

            if (prev) {
                state.currentSong = formatSong(prev, state.preferredQuality);
                state.isPlaying = true;
                state.recentlyPlayed = [
                    state.currentSong,
                    ...state.recentlyPlayed.filter((s) => s.id !== state.currentSong?.id),
                ].slice(0, 20);
            }
        },
        applyMusicPlayerSettings: (state, action: PayloadAction<Partial<MusicPlayerState>>) => {
            const {
                preferredQuality,
                equalizerSettings,
                isGaplessEnabled,
                crossfadeDuration,
                isSongRadioEnabled,
                downloadSettings,
                visualizerStyle,
                repeatMode,
                shuffle,
                playbackSpeed
            } = action.payload;

            if (preferredQuality) state.preferredQuality = preferredQuality;
            if (equalizerSettings) state.equalizerSettings = equalizerSettings;
            if (isGaplessEnabled !== undefined) state.isGaplessEnabled = isGaplessEnabled;
            if (crossfadeDuration !== undefined) state.crossfadeDuration = crossfadeDuration;
            if (isSongRadioEnabled !== undefined) state.isSongRadioEnabled = isSongRadioEnabled;
            if (downloadSettings) state.downloadSettings = downloadSettings;
            if (visualizerStyle) state.visualizerStyle = visualizerStyle;
            if (repeatMode) state.repeatMode = repeatMode;
            if (shuffle !== undefined) state.shuffle = shuffle;
            if (playbackSpeed !== undefined) state.playbackSpeed = playbackSpeed;
        },
        setRecentlyPlayed: (state, action: PayloadAction<Song[]>) => {
            state.recentlyPlayed = action.payload.slice(0, 20);
        },
        setVolume: (state, action: PayloadAction<number>) => {
            const raw = typeof action.payload === 'number' && !isNaN(action.payload) ? action.payload : 0.7;
            const clamped = Math.min(2.0, Math.max(0, raw));
            if (state.isMuted) {
                // If currently muted, updating volume updates the stored target volume without unmuting
                state.previousVolume = clamped > 0 ? clamped : 0.7;
            } else {
                state.volume = clamped;
                if (clamped > 0) {
                    state.previousVolume = clamped;
                }
            }
        },
        toggleMute: (state) => {
            if (state.isMuted) {
                // Unmute: restore previous non-zero volume
                state.isMuted = false;
                state.volume = state.previousVolume > 0 ? state.previousVolume : 0.7;
            } else {
                // Mute: save current volume if positive
                if (state.volume > 0) {
                    state.previousVolume = state.volume;
                }
                state.isMuted = true;
                state.volume = 0;
            }
        },
    },
    extraReducers: (builder) => {
        // Redux Persist Rehydration normalization
        builder.addCase('persist/REHYDRATE', (state: any, action: any) => {
            const incoming = action.payload?.musicPlayer;
            if (incoming) {
                // Normalize volume (0 - 2.0, default 0.7)
                const rawVol = incoming.volume;
                const validVol = typeof rawVol === 'number' && !isNaN(rawVol) ? Math.min(2.0, Math.max(0, rawVol)) : 0.7;
                state.volume = validVol;

                state.isMuted = Boolean(incoming.isMuted);

                const rawPrev = incoming.previousVolume;
                state.previousVolume = typeof rawPrev === 'number' && !isNaN(rawPrev) && rawPrev > 0 ? Math.min(2.0, Math.max(0.05, rawPrev)) : (validVol > 0 ? validVol : 0.7);
            }
            // Guarantee ephemeral drawer overlays always initialize closed on application startup/rehydration
            state.isSettingsOpen = false;
            state.isQueueOpen = false;
        });
    },
});

export const {
    setSongs,
    setSearchedSongs,
    setIsSearching,
    setSearchError,
    setSearchQueryState,
    playMusic,
    pauseMusic,
    setCurrentSong,
    setSleepTimer,
    decrementSleepTimer,
    setPlaybackSpeed,
    setPreferredQuality,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
    reorderQueue,
    setRecommendations,
    addRecentlyPlayedAlbum,
    clearQueue,
    setSettingsOpen,
    setQueueOpen,
    setEqualizerEnabled,
    setEqualizerBand,
    setEqualizerPreset,
    setGaplessEnabled,
    setCrossfadeDuration,
    setCurrentTime,
    setSongRadioEnabled,
    setWifiOnly,
    setMaxConcurrency,
    setDailyMix,
    setVisualizerStyle,
    toggleRepeatMode,
    toggleShuffle,
    nextSong,
    prevSong,
    applyMusicPlayerSettings,
    setRecentlyPlayed,
    setVolume,
    toggleMute,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
