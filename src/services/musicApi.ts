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
    lyrics as lyricsUrl,
    suggestions as suggestionsUrl,
    playlistSearch,
    searchArtist
} from '../constants';
import { Song, Album, Playlist, Artist, SearchResults } from '../types/music';

// Initialize LRU Cache (max 100 items, 5 minutes TTL)
const cache = new LRUCache<string, unknown>({
    max: 100,
    ttl: 1000 * 60 * 5,
});

const apiClient = axios.create({
    timeout: 10000,
});

// Configure Axios Retry
axiosRetry(apiClient, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
    }
});

apiClient.interceptors.response.use(
    response => response,
    error => {
        console.error('API Call Error:', error.message);
        return Promise.reject(error);
    }
);

/**
 * Generic fetcher with caching and in-flight request deduplication
 */
const inFlightRequests = new Map<string, Promise<unknown>>();

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

export const musicApi = {
    getAlbumById: async (id: string, signal?: AbortSignal): Promise<Album> => {
        return fetchWithCache(`album_${id}`, async () => {
            const response = await apiClient.get(albumById, { params: { id }, signal });
            return response.data.data;
        });
    },

    getPlaylistById: async (id: string, signal?: AbortSignal): Promise<Playlist> => {
        return fetchWithCache(`playlist_${id}`, async () => {
            const response = await apiClient.get(playlistById, { params: { id }, signal });
            return response.data.data;
        });
    },

    getArtistById: async (id: string, signal?: AbortSignal): Promise<Artist> => {
        return fetchWithCache(`artist_${id}`, async () => {
            const response = await apiClient.get(`${artistById}${id}`, { signal });
            return response.data.data;
        });
    },

    searchSongs: async (query: string, page = 0, limit = 25, signal?: AbortSignal): Promise<Song[]> => {
        return fetchWithCache(`search_songs_${query}_${page}_${limit}`, async () => {
            const response = await apiClient.get(songsUrl, { params: { query, page, limit }, signal });
            return response.data.data.results || [];
        });
    },

    searchAll: async (query: string, signal?: AbortSignal): Promise<SearchResults> => {
        return fetchWithCache(`search_all_${query}`, async () => {
            const response = await apiClient.get(searchUrl, { params: { query }, signal });
            return response.data.data;
        });
    },

    getTrending: async (language: string, page = 0, limit = 25, signal?: AbortSignal): Promise<Album[]> => {
        return fetchWithCache(`trending_${language}_${page}_${limit}`, async () => {
            const response = await apiClient.get(modules, { params: { query: language, page, limit }, signal });
            // The API returns albums in the results for the 'trending' call in this context
            return (response.data.data.results || []).map((album: Album) => ({
                ...album,
                type: 'album'
            }));
        });
    },

    getLyrics: async (id: string, signal?: AbortSignal): Promise<{ lyrics: string; snippet: string }> => {
        return fetchWithCache(`lyrics_${id}`, async () => {
            const response = await apiClient.get(`${lyricsUrl}${id}/lyrics`, { signal });
            return response.data.data;
        });
    },

    getExternalLyrics: async (query: string, signal?: AbortSignal): Promise<any[]> => {
        return fetchWithCache(`ext_lyrics_${query}`, async () => {
            const response = await axios.get(`https://lrclib.net/api/search?q=${query}`, { signal });
            return response.data;
        });
    },

    getSuggestions: async (id: string, signal?: AbortSignal): Promise<Song[]> => {
        return fetchWithCache(`suggestions_${id}`, async () => {
            const response = await apiClient.get(suggestionsUrl(id), { signal });
            return response.data.data || [];
        });
    },

    searchPlaylists: async (query: string, page = 0, limit = 25, signal?: AbortSignal): Promise<Playlist[]> => {
        return fetchWithCache(`search_playlists_${query}_${page}_${limit}`, async () => {
            const response = await apiClient.get(playlistSearch, { params: { query, page, limit }, signal });
            return response.data.data.results || [];
        });
    },

    searchArtists: async (query: string, page = 0, limit = 25, signal?: AbortSignal): Promise<Artist[]> => {
        return fetchWithCache(`search_artists_${query}_${page}_${limit}`, async () => {
            const response = await apiClient.get(searchArtist, { params: { query, page, limit }, signal });
            return response.data.data.results || [];
        });
    }
};
