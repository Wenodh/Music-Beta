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
}

export interface MusicPlayerState {
    songs: Song[];
    recommendations: Song[];
    isPlaying: boolean;
    currentSong: Song | null;
    searchedSongs: any;
    recentlyPlayed: Song[];
    sleepTimer: number | null;
    preferredQuality: '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps';
    isSettingsOpen: boolean;
    isQueueOpen: boolean;
    autoPlay: boolean;
}
