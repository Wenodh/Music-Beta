import { Song } from './music';

export interface ApiResponse<T> {
    status: string;
    message: string | null;
    data: T;
}

export interface SearchResults {
    songs: {
        results: Song[];
        position: number;
    };
    albums: {
        results: AlbumSearchResult[];
        position: number;
    };
    artists: {
        results: ArtistSearchResult[];
        position: number;
    };
    playlists: {
        results: PlaylistSearchResult[];
        position: number;
    };
    topQuery: {
        results: any[];
        position: number;
    };
}

export interface AlbumSearchResult {
    id: string;
    name: string;
    title?: string;
    image: string | { url: string; quality: string }[];
    artist: string;
    url: string;
    type: string;
    description: string;
    year?: string;
    songCount?: string;
    language?: string;
}

export interface ArtistSearchResult {
    id: string;
    name: string;
    image: string | { url: string; quality: string }[];
    url: string;
    type: string;
    role: string;
    description?: string;
}

export interface PlaylistSearchResult {
    id: string;
    name: string;
    image: string | { url: string; quality: string }[];
    url: string;
    type: string;
    language?: string;
    songCount?: string;
}

export interface AlbumDetails extends AlbumSearchResult {
    primaryArtists: string;
    songs: Song[];
}

export interface ArtistDetails extends ArtistSearchResult {
    followerCount: string;
    fanCount: string;
    isVerified: boolean;
    bio: any;
    wiki: string;
    twitter: string;
    fb: string;
    topSongs: Song[];
    topAlbums: AlbumSearchResult[];
    singles: AlbumSearchResult[];
    similarArtists: ArtistSearchResult[];
}

export interface PlaylistDetails extends PlaylistSearchResult {
    songs: Song[];
    firstname?: string;
    lastname?: string;
}
