import { Album, Playlist, Artist, SearchResults } from '../../types/music';
import { MediaItem } from './models';
import { mediaItemToSong } from '../adapters/mediaItemAdapter';

export class SearchAdapter {
    static mediaItemsToSearchResults(items: MediaItem[]): SearchResults {
        const results: SearchResults = {
            albums: { results: [] },
            songs: { results: [] },
            playlists: { results: [] },
            artists: { results: [] },
            radio: { results: [] },
            audiobooks: { results: [] },
            topQuery: { results: [] }
        };

        items.forEach(item => {
            const metadata = item.metadata as Record<string, any>;
            switch(item.type) {
                case 'song':
                    results.songs.results.push(mediaItemToSong(item));
                    break;
                case 'album':
                    results.albums.results.push({
                        ...metadata,
                        id: item.id,
                        name: item.title,
                        image: item.artwork.map(a => ({ quality: a.quality || 'unknown', url: a.url })),
                        artist: (metadata.artist as string) || (item.subtitle as string) || ''
                    } as Album);
                    break;
                case 'playlist':
                    results.playlists.results.push({
                        ...metadata,
                        id: item.id,
                        name: item.title,
                        image: item.artwork.map(a => ({ quality: a.quality || 'unknown', url: a.url })),
                    } as Playlist);
                    break;
                case 'artist':
                    results.artists.results.push({
                        ...metadata,
                        id: item.id,
                        name: item.title,
                        image: item.artwork.map(a => ({ quality: a.quality || 'unknown', url: a.url })),
                    } as Artist);
                    break;
                case 'radio':
                    results.radio?.results.push(mediaItemToSong(item));
                    break;
                case 'audiobook':
                    results.audiobooks?.results.push(item);
                    break;
            }
        });

        // Heuristic for top query
        if (results.songs.results.length > 0) {
            results.topQuery.results = [results.songs.results[0]];
        } else if (results.albums.results.length > 0) {
            results.topQuery.results = [results.albums.results[0]];
        }

        return results;
    }
}
