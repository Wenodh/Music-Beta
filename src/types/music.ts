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
    isPlaying: boolean;
    currentSong: Song | null;
    searchedSongs: Song[];
    recentlyPlayed: Song[];
    sleepTimer: number | null;
}
