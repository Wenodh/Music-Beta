import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song, MusicPlayerState } from '../../types/music';

const initialState: MusicPlayerState = {
    songs: [],
    recommendations: [],
    isPlaying: false,
    currentSong: null,
    searchedSongs: [],
    recentlyPlayed: [],
    sleepTimer: null,
    preferredQuality: '320kbps',
    isSettingsOpen: false,
    isQueueOpen: false,
    equalizerSettings: {
        enabled: false,
        bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        preset: 'Normal',
    },
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
        playMusic: (state, action: PayloadAction<any>) => {
            const song = action.payload;
            const id = song.id;

            // Toggle play/pause if current song is clicked again
            if (state.currentSong && state.currentSong.id === id) {
                state.isPlaying = !state.isPlaying;
            } else {
                // If a new song is played
                const downloadUrl = song.downloadUrl || song.music;
                let musicUrl = downloadUrl;
                if (Array.isArray(downloadUrl)) {
                    musicUrl = downloadUrl.find((d: any) => d.quality === state.preferredQuality)?.url ||
                               downloadUrl[downloadUrl.length - 1]?.url;
                }

                state.currentSong = {
                    ...song,
                    image: Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image,
                    downloadUrl: downloadUrl,
                    music: musicUrl,
                } as Song;
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
        setRecommendations: (state, action: PayloadAction<Song[]>) => {
            state.recommendations = action.payload;
        },
        setPreferredQuality: (state, action: PayloadAction<MusicPlayerState['preferredQuality']>) => {
            state.preferredQuality = action.payload;
            if (state.currentSong) {
                // We don't change the actual playing source here to avoid interruption
                // but we update the currentSong object so it's ready for the next play or manual reload
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
    },
});

export const {
    setSongs,
    setSearchedSongs,
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
    setSettingsOpen,
    setQueueOpen,
    setEqualizerEnabled,
    setEqualizerBand,
    setEqualizerPreset,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
