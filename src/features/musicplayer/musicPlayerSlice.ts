import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song, MusicPlayerState, SearchResults, Album } from '../../types/music';
import { getNextSong, getPrevSong } from '../../utils/playlist';
import { HistoryItem, MediaItem } from '../../lib/audio-sdk/models';
import { songToMediaItem } from '../../lib/adapters/mediaItemAdapter';

const initialState: MusicPlayerState = {
    songs: [],
    recommendations: [],
    isPlaying: false,
    currentSong: null,
    searchQuery: '',
    searchedSongs: [],
    recentSearches: [],
    recentlyPlayed: [],
    history: [],
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
    },
    dailyMix: [],
    lastDailyMixUpdate: 0,
    recommendationsCache: {},
    visualizerStyle: 'bars',
    repeatMode: 'none',
    shuffle: false,
};

// Helper to format song for currentSong state
const formatSong = (song: Partial<Song> & { music?: any; downloadUrl?: any }, preferredQuality: string): Song => {
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
        setSearchedSongs: (state, action: PayloadAction<SearchResults | Song[]>) => {
            state.searchedSongs = action.payload;
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        addRecentSearch: (state, action: PayloadAction<string>) => {
            const query = action.payload.trim();
            if (!query) return;
            state.recentSearches = [
                query,
                ...state.recentSearches.filter(s => s.toLowerCase() !== query.toLowerCase())
            ].slice(0, 10);
        },
        removeRecentSearch: (state, action: PayloadAction<string>) => {
            state.recentSearches = state.recentSearches.filter(s => s !== action.payload);
        },
        clearRecentSearches: (state) => {
            state.recentSearches = [];
        },
        playMusic: (state, action: PayloadAction<Partial<Song> & { forcePlay?: boolean; audioBlob?: any; imageBlob?: any }>) => {
            const { audioBlob, imageBlob, forcePlay, ...songData } = action.payload;
            const id = songData.id;

            // Toggle play/pause if current song is clicked again (unless forcePlay is true)
            if (!forcePlay && state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                state.currentSong = formatSong(songData, state.preferredQuality);
                state.isPlaying = true;

                // Add to recently played (Legacy sync)
                state.recentlyPlayed = [
                    state.currentSong,
                    ...state.recentlyPlayed.filter((s) => s.id !== id),
                ].slice(0, 20);

                // Sync to new history format
                const media = songToMediaItem(state.currentSong);
                state.history = [
                    {
                        id: media.id,
                        media,
                        playedAt: new Date().toISOString(),
                        listenedDuration: 0
                    },
                    ...(state.history || []).filter(h => h.id !== media.id)
                ].slice(0, 50);

                // Also ensure it's in the current playlist if not already there
                if (!state.songs.find(s => s.id === id)) {
                    state.songs = [state.currentSong, ...state.songs].slice(0, 100);
                }
            }
        },
        pauseMusic: (state) => {
            state.isPlaying = false;
        },
        setCurrentSong: (state, action: PayloadAction<Song | null>) => {
            state.currentSong = action.payload;
        },
        setSleepTimer: (state, action: PayloadAction<number | null>) => {
            state.sleepTimer = action.payload;
        },
        decrementSleepTimer: (state) => {
            if (state.sleepTimer !== null) {
                if (state.sleepTimer > 1) {
                    state.sleepTimer -= 1;
                } else {
                    state.sleepTimer = null;
                    state.isPlaying = false;
                }
            }
        },
        addToQueue: (state, action: PayloadAction<Song>) => {
            if (!state.songs.find(s => s.id === action.payload.id)) {
                state.songs.push(action.payload);
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
        addRecentlyPlayedAlbum: (state, action: PayloadAction<Album>) => {
            const album = action.payload;
            state.recentlyPlayedAlbums = [
                { ...album, type: 'album' },
                ...state.recentlyPlayedAlbums.filter((a) => a.id !== album.id),
            ].slice(0, 20) as (Album & { type: string })[];
        },
        addToHistory: (state, action: PayloadAction<HistoryItem>) => {
            state.history = [
                action.payload,
                ...(state.history || []).filter(h => h.id !== action.payload.id)
            ].slice(0, 50);
        },
        updateHistoryDuration: (state, action: PayloadAction<{ id: string; duration: number }>) => {
            const item = (state.history || []).find(h => h.id === action.payload.id);
            if (item) {
                item.listenedDuration += action.payload.duration;
            }
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
        playMedia: (state, action: PayloadAction<MediaItem>) => {
            const media = action.payload;
            state.history = [
                {
                    id: media.id,
                    media,
                    playedAt: new Date().toISOString(),
                    listenedDuration: 0
                },
                ...(state.history || []).filter(h => h.id !== media.id)
            ].slice(0, 50);
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
                shuffle
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
        },
    },
});

export const {
    setSongs,
    setSearchedSongs,
    setSearchQuery,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    playMusic,
    pauseMusic,
    setCurrentSong,
    setSleepTimer,
    decrementSleepTimer,
    setPreferredQuality,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    setRecommendations,
    addRecentlyPlayedAlbum,
    addToHistory,
    updateHistoryDuration,
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
    setDailyMix,
    setVisualizerStyle,
    toggleRepeatMode,
    toggleShuffle,
    nextSong,
    prevSong,
    playMedia,
    applyMusicPlayerSettings,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
