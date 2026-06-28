import { Song, Album, Artist, Playlist, SearchResults } from '../../types/music';

export interface IMusicProvider {
    name: string;
    searchSongs(query: string, page?: number, limit?: number): Promise<Song[]>;
    searchAlbums(query: string, page?: number, limit?: number): Promise<Album[]>;
    searchArtists(query: string, page?: number, limit?: number): Promise<Artist[]>;
    searchPlaylists(query: string, page?: number, limit?: number): Promise<Playlist[]>;
    searchAll(query: string): Promise<SearchResults>;
    getSongDetails(id: string): Promise<Song>;
    getAlbumDetails(id: string): Promise<Album>;
    getArtistDetails(id: string): Promise<Artist>;
    getPlaylistDetails(id: string): Promise<Playlist>;
    getSuggestions(id: string, limit?: number): Promise<Song[]>;
    getTrending(limit?: number): Promise<Song[]>;
    getNewReleases(limit?: number): Promise<Song[]>;
}
