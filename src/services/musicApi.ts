import axios from 'axios';
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

const apiClient = axios.create({
    timeout: 10000,
});

apiClient.interceptors.response.use(
    response => response,
    error => {
        console.error('API Call Error:', error.message);
        return Promise.reject(error);
    }
);

export const musicApi = {
    getAlbumById: async (id: string): Promise<Album> => {
        const response = await apiClient.get(`${albumById}${id}`);
        return response.data.data;
    },

    getPlaylistById: async (id: string): Promise<Playlist> => {
        const response = await apiClient.get(`${playlistById}${id}`);
        return response.data.data;
    },

    getArtistById: async (id: string): Promise<Artist> => {
        const response = await apiClient.get(`${artistById}${id}`);
        return response.data.data;
    },

    searchSongs: async (query: string, page = 0, limit = 25): Promise<Song[]> => {
        const response = await apiClient.get(`${songsUrl}?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        return response.data.data.results || [];
    },

    searchAll: async (query: string): Promise<SearchResults> => {
        const response = await apiClient.get(`${searchUrl}${encodeURIComponent(query)}`);
        return response.data.data;
    },

    getTrending: async (language: string, page = 0, limit = 25): Promise<Album[]> => {
        const response = await apiClient.get(`${modules}${language}&page=${page}&limit=${limit}`);
        return response.data.data.results || [];
    },

    getLyrics: async (id: string): Promise<{ lyrics: string; snippet: string }> => {
        const response = await apiClient.get(`${lyricsUrl}${id}/lyrics`);
        return response.data.data;
    },

    getSuggestions: async (id: string): Promise<Song[]> => {
        const response = await apiClient.get(suggestionsUrl(id));
        return response.data.data || [];
    },

    searchPlaylists: async (query: string, page = 0, limit = 25): Promise<Playlist[]> => {
        const response = await apiClient.get(`${playlistSearch}${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        return response.data.data.results || [];
    },

    searchArtists: async (query: string, page = 0, limit = 25): Promise<Artist[]> => {
        const response = await apiClient.get(`${searchArtist}${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        return response.data.data.results || [];
    }
};
