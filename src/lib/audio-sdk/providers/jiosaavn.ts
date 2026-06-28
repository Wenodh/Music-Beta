import { AudioProvider, SearchOptions } from '../registry';
import { MediaItem, PlayableSource } from '../models';
import { musicApi } from '../../../services/musicApi';
import { songToMediaItem } from '../adapters';
import { getOfflineSong } from '../../../utils/db';

export class JioSaavnProvider implements AudioProvider {
    readonly id = 'jiosaavn';
    readonly name = 'JioSaavn';
    readonly supportedTypes = ['song', 'album', 'artist', 'playlist'];

    private blobUrls: Map<string, string> = new Map();

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        const songs = await musicApi.searchSongs(query, options?.page, options?.limit);
        return songs.map(s => songToMediaItem(s, this.id));
    }

    async getMedia(id: string, type: string): Promise<MediaItem> {
        switch(type) {
            case 'song': {
                throw new Error('Get song by ID not fully implemented in legacy musicApi');
            }
            case 'album': {
                const album = await musicApi.getAlbumById(id);
                return {
                    id: album.id,
                    provider: this.id,
                    type: 'album',
                    title: album.name,
                    artwork: Array.isArray(album.image) ? album.image.map(i => ({ url: i.url, quality: i.quality })) : [],
                    playable: false,
                    metadata: album
                } as MediaItem;
            }
            default:
                throw new Error(`Type ${type} not supported by JioSaavnProvider`);
        }
    }

    async getRecommendations(id: string): Promise<MediaItem[]> {
        const recommendations = await musicApi.getSuggestions(id);
        return recommendations.map(s => songToMediaItem(s, this.id));
    }

    async getPlayableSource(id: string, _quality: string = '320kbps'): Promise<PlayableSource> {
        const offlineSong = await getOfflineSong(id);
        if (offlineSong?.audioBlob) {
            // Reuse existing blob URL if available to prevent memory leaks and playback gaps
            let url = this.blobUrls.get(id);
            if (!url) {
                url = URL.createObjectURL(offlineSong.audioBlob);
                this.blobUrls.set(id, url);

                // Cleanup if registry gets too large
                if (this.blobUrls.size > 20) {
                    const firstKey = this.blobUrls.keys().next().value;
                    if (firstKey) {
                        URL.revokeObjectURL(this.blobUrls.get(firstKey)!);
                        this.blobUrls.delete(firstKey);
                    }
                }
            }
            return {
                url,
                format: 'mp3',
            };
        }

        throw new Error('URL resolution from ID only not implemented; requires metadata or full API support');
    }
}
