export interface Song {
    id: string;
    name: string;
    title?: string;
    duration: string | number;
    image: string | { url: string; quality: string }[];
    music?: string | { url: string; quality: string }[];
    downloadUrl: string | { url: string; quality: string }[];
    primaryArtists: string;
    albumId?: string;
    album?: {
        id: string;
        name: string;
    } | string;
    type?: string;
    year?: string | number;
}

export interface MusicPlayerState {
    songs: Song[];
    recommendations: Song[];
    isPlaying: boolean;
    currentSong: Song | null;
    searchedSongs: any;
    isSearching?: boolean;
    searchError?: string | null;
    searchQuery?: string;
    recentlyPlayed: Song[];
    recentlyPlayedAlbums: any[];
    sleepTimer: number | null;
    preferredQuality: '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps';
    isSettingsOpen: boolean;
    isQueueOpen: boolean;
    equalizerSettings: EqualizerSettings;
    isGaplessEnabled: boolean;
    crossfadeDuration: number;
    currentTime: number;
    isSongRadioEnabled: boolean;
    downloadSettings: DownloadSettings;
    dailyMix: Song[];
    lastDailyMixUpdate: number;
    recommendationsCache: {
        [songId: string]: {
            songs: Song[];
            timestamp: number;
        };
    };
    visualizerStyle: 'bars' | 'waveform' | 'particles' | 'circular' | 'pixel';
    repeatMode: 'none' | 'all' | 'one';
    shuffle: boolean;
    playbackSpeed: 0.75 | 1.0 | 1.25 | 1.5 | 2.0;
    sleepTimerMode: 'duration' | 'endOfTrack' | null;
    volume: number; // 0 to 2.0 (0-1.0 normal, 1.0-2.0 boosted)
    isMuted: boolean;
    previousVolume: number;
}

export interface DownloadSettings {
    wifiOnly: boolean;
    maxConcurrency?: number;
}

export interface EqualizerSettings {
    enabled: boolean;
    bands: number[]; // 10 bands: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
    preset: string;
}
