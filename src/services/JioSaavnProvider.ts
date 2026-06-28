import axios from 'axios';
import axiosRetry from 'axios-retry';
import { LRUCache } from 'lru-cache';
import {
    albumById,
    playlistById,
    songs as songsUrl,
    search as searchUrl,
    artistById,
    modules,
    suggestions as suggestionsUrl,
    playlistSearch,
    searchArtist
} from '../constants';
import { Song, Album, Playlist, Artist, SearchResults } from '../types/music';
import { IMusicProvider } from '../domain/providers/MusicProvider';

const cache = new LRUCache<string, unknown>({
    max: 100,
    ttl: 1000 * 60 * 5,
});

const apiClient = axios.create({
    timeout: 10000,
});

axiosRetry(apiClient, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
    }
});

const inFlightRequests = new Map<string, Promise<any>>();

const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const cachedData = cache.get(key);
    if (cachedData) return cachedData as T;

    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key) as Promise<T>;
    }

    const request = fetcher().finally(() => {
        inFlightRequests.delete(key);
    });

    inFlightRequests.set(key, request);

    try {
        const data = await request;
        cache.set(key, data);
        return data;
    } catch (error) {
        throw error;
    }
};

export class JioSaavnProvider implements IMusicProvider {
    name = 'JioSaavn';

    async searchSongs(query: string, page = 0, limit = 25): Promise<Song[]> {
        return fetchWithCache(`search_songs_${query}_${page}_${limit}`, async () => {
            const response = await apiClient.get(songsUrl, { params: { query, page, limit } });
            return response.data.data.results || [];
        });
    }

    async searchAlbums(query: string, page = 0, limit = 25): Promise<Album[]> {
        return fetchWithCache(`search_albums_${query}_${page}_${limit}`, async () => {
            // Reusing searchAll or implementing specific album search if available
            const response = await apiClient.get(searchUrl, { params: { query } });
            return response.data.data.albums?.results || [];
        });
    }

    async searchArtists(query: string, page = 0, limit = 25): Promise<Artist[]> {
        return fetchWithCache(`search_artists_${query}_${page}_${limit}`, async () => {
            const response = await apiClient.get(searchArtist, { params: { query, page, limit } });
            return response.data.data.results || [];
        });
    }

    async searchPlaylists(query: string, page = 0, limit = 25): Promise<Playlist[]> {
        return fetchWithCache(`search_playlists_${query}_${page}_${limit}`, async () => {
            const response = await apiClient.get(playlistSearch, { params: { query, page, limit } });
            return response.data.data.results || [];
        });
    }

    async searchAll(query: string): Promise<SearchResults> {
        return fetchWithCache(`search_all_${query}`, async () => {
            const response = await apiClient.get(searchUrl, { params: { query } });
            return response.data.data;
        });
    }

    async getSongDetails(id: string): Promise<Song> {
        return fetchWithCache(`song_${id}`, async () => {
            // Note: JioSaavn often returns multiple songs for detail queries, taking first
            const response = await apiClient.get(songsUrl, { params: { query: id } });
            return response.data.data.results[0];
        });
    }

    async getAlbumDetails(id: string): Promise<Album> {
        return fetchWithCache(`album_${id}`, async () => {
            const response = await apiClient.get(albumById, { params: { id } });
            return response.data.data;
        });
    }

    async getArtistDetails(id: string): Promise<Artist> {
        return fetchWithCache(`artist_${id}`, async () => {
            const response = await apiClient.get(`${artistById}${id}`);
            return response.data.data;
        });
    }

    async getPlaylistDetails(id: string): Promise<Playlist> {
        return fetchWithCache(`playlist_${id}`, async () => {
            const response = await apiClient.get(playlistById, { params: { id } });
            return response.data.data;
        });
    }

    async getSuggestions(id: string, limit = 20): Promise<Song[]> {
        return fetchWithCache(`suggestions_${id}`, async () => {
            const response = await apiClient.get(suggestionsUrl(id));
            return response.data.data || [];
        });
    }

    async getTrending(limit = 25): Promise<Song[]> {
        return fetchWithCache(`trending_songs_${limit}`, async () => {
            const response = await apiClient.get(modules, { params: { language: 'hindi,english' } });
            return response.data.data.trending.songs || [];
        });
    }

    async getNewReleases(limit = 25): Promise<Song[]> {
        return fetchWithCache(`new_releases_${limit}`, async () => {
            const response = await apiClient.get(modules, { params: { language: 'hindi,english' } });
            return response.data.data.albums || []; // In some cases, new releases are albums
        });
    }
}

export const jioSaavnProvider = new JioSaavnProvider();
