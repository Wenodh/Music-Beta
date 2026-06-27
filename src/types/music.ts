export interface Song {
    id: string;
    name: string;
    type: string;
    album: {
        id: string;
        name: string;
        url: string;
    } | string;
    year: string | number;
    releaseDate: string;
    duration: number | string;
    label: string;
    primaryArtists: string;
    primaryArtistsId: string;
    featuredArtists: string;
    featuredArtistsId: string;
    explicitContent: boolean;
    playCount: number | string;
    language: string;
    hasLyrics: boolean;
    url: string;
    image: { quality: string; url: string }[] | string;
    downloadUrl: { quality: string; url: string }[] | string;
    music?: { quality: string; url: string }[] | string;
    albumId?: string;
    albumName?: string;
    artist?: string;
}

export interface Album {
    id: string;
    name: string;
    description: string;
    year: string | number;
    releaseDate: string;
    songCount: string | number;
    url: string;
    primaryArtistsId: string;
    primaryArtists: string;
    featuredArtists: string;
    artists: any[];
    image: { quality: string; url: string }[] | string;
    songs: Song[];
}

export interface Playlist {
    id: string;
    userId: string;
    name: string;
    followerCount: string | number;
    songCount: string | number;
    username: string;
    firstname: string;
    lastname: string;
    shares: string | number;
    image: { quality: string; url: string }[] | string;
    url: string;
    songs: Song[];
}

export interface Artist {
    id: string;
    name: string;
    url: string;
    image: { quality: string; url: string }[] | string;
    followerCount: string | number;
    isVerified: boolean;
    dominantLanguage: string;
    dominantType: string;
    bio: any[];
    dob: string;
    fb: string;
    twitter: string;
    wiki: string;
    availableLanguages: string[];
    fanCount: string;
    topSongs: Song[];
    topAlbums: Album[];
    singles: Song[];
    dedicatedPlaylist: Playlist[];
    similarArtists: any[];
}

export interface SearchResults {
    albums: { results: Album[] };
    songs: { results: Song[] };
    playlists: { results: Playlist[] };
    artists: { results: Artist[] };
    topQuery: { results: any[] };
}

export interface MusicPlayerState {
    songs: Song[];
    recommendations: Song[];
    isPlaying: boolean;
    currentSong: Song | null;
    searchQuery: string;
    searchedSongs: SearchResults | Song[];
    recentlyPlayed: Song[];
    recentlyPlayedAlbums: (Album & { type: string })[];
    recentSearches: string[];
    sleepTimer: number | null;
    preferredQuality: '96kbps' | '160kbps' | '320kbps';
    isSettingsOpen: boolean;
    isQueueOpen: boolean;
    equalizerSettings: {
        enabled: boolean;
        bands: number[];
        preset: string;
    };
    isGaplessEnabled: boolean;
    crossfadeDuration: number;
    currentTime: number;
    isSongRadioEnabled: boolean;
    downloadSettings: {
        wifiOnly: boolean;
    };
    dailyMix: Song[];
    lastDailyMixUpdate: number;
    recommendationsCache: Record<string, { songs: Song[]; timestamp: number }>;
    visualizerStyle: 'pulse' | 'vortex' | 'grid' | 'bars' | 'wave';
    repeatMode: 'none' | 'all' | 'one';
    shuffle: boolean;
}
