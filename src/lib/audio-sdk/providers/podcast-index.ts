import { AudioProvider, SearchOptions, ProviderCapabilities, ProviderInfo } from '../registry';
import { MediaItem, PlayableSource } from '../models';

export interface PodcastIndexConfig {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
}

export class PodcastIndexProvider implements AudioProvider {
    readonly id = 'podcast-index';
    readonly name = 'Podcast Index';
    readonly supportedTypes = ['podcast', 'episode'];

    readonly capabilities: ProviderCapabilities = {
        search: true,
        recommendations: true,
        favorites: true,
        history: true,
        downloads: true,
        resumableDownloads: true,
        offlinePlayback: true,
        cloudSync: true,
        continueListening: true,
        streaming: true,
        live: false,
        lyrics: false,
        speedControl: true,
        authentication: false,
    };

    readonly info: ProviderInfo = {
        id: 'podcast-index',
        displayName: 'Podcast Index',
        supportsOffline: true,
        supportsStreaming: true,
    };

    private config: PodcastIndexConfig;

    constructor(config: PodcastIndexConfig = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'https://api.podcastindex.org/api/1.0',
            ...config
        };
    }

    private async fetchApi(endpoint: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<any> {
        // If credentials are missing, we should ideally call our own Supabase Edge Function.
        // For development, we'll implement a mock fallback if no credentials are provided.
        if (!this.config.apiKey) {
            return this.getMockResponse(endpoint, params);
        }

        // Implementation for authenticated calls would go here,
        // including hash generation for 'X-Auth-Key', 'X-Auth-Date', 'Authorization'
        throw new Error('Authenticated Podcast Index calls should be routed through Supabase Edge Functions');
    }

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        const results = await this.fetchApi('search/byterm', { q: query, max: options?.limit || 20 }, options?.signal);
        return results.feeds?.map((f: any) => this.mapFeedToMediaItem(f)) || [];
    }

    async searchEpisodes(query: string, limit: number = 20): Promise<MediaItem[]> {
        const results = await this.fetchApi('search/byperson', { q: query, max: limit }); // Person or term?term is more general
        return results.items?.map((e: any) => this.mapEpisodeToMediaItem(e)) || [];
    }

    async getMedia(id: string, type: string): Promise<MediaItem> {
        if (type === 'podcast') {
            const result = await this.fetchApi('podcasts/byfeedid', { id });
            return this.mapFeedToMediaItem(result.feed);
        } else if (type === 'episode') {
            const result = await this.fetchApi('episodes/byid', { id });
            return this.mapEpisodeToMediaItem(result.episode);
        }
        throw new Error(`Type ${type} not supported by PodcastIndexProvider`);
    }

    async getEpisodes(podcastId: string, limit: number = 100): Promise<MediaItem[]> {
        const result = await this.fetchApi('episodes/byfeedid', { id: podcastId, max: limit });
        return result.items?.map((e: any) => this.mapEpisodeToMediaItem(e)) || [];
    }

    async getTrending(limit: number = 20): Promise<MediaItem[]> {
        const result = await this.fetchApi('recent/feeds', { max: limit });
        return result.feeds?.map((f: any) => this.mapFeedToMediaItem(f)) || [];
    }

    async getRecommendations(id: string): Promise<MediaItem[]> {
        // Placeholder for related podcasts
        return this.getTrending(10);
    }

    async getPlayableSource(id: string, _quality?: string): Promise<PlayableSource> {
        // Check offline storage
        const { StorageService } = await import('../../storage/StorageService');
        const offlineData = await StorageService.getDownload(id);
        if (offlineData?.blob) {
            return {
                url: URL.createObjectURL(offlineData.blob),
                format: 'mp3',
            };
        }

        const episode = await this.getMedia(id, 'episode');
        if (!episode.stream?.url) throw new Error('No audio URL found for episode');
        return episode.stream;
    }

    private mapFeedToMediaItem(f: any): MediaItem {
        return {
            id: String(f.id),
            provider: this.id,
            type: 'podcast',
            title: f.title,
            subtitle: f.author,
            description: f.description,
            artwork: f.image ? [{ url: f.image }] : [],
            playable: false,
            language: f.language,
            genres: f.categories ? Object.values(f.categories) as string[] : [],
            metadata: {
                ...f,
                episodeCount: f.episodeCount,
                itunesId: f.itunesId
            }
        };
    }

    private mapEpisodeToMediaItem(e: any): MediaItem {
        return {
            id: String(e.id),
            provider: this.id,
            type: 'episode',
            title: e.title,
            subtitle: e.feedTitle || e.author,
            description: e.description,
            artwork: e.image ? [{ url: e.image }] : (e.feedImage ? [{ url: e.feedImage }] : []),
            playable: true,
            duration: e.duration,
            publishedAt: new Date(e.datePublished * 1000).toISOString(),
            stream: {
                url: e.enclosureUrl,
                format: 'mp3', // Defaulting to mp3, Index usually provides enclosure types
                mimeType: e.enclosureType
            },
            metadata: {
                ...e,
                podcastId: e.feedId
            }
        };
    }

    private getMockResponse(endpoint: string, params: any): any {
        // Mock data for development when API keys are not present
        if (endpoint.includes('search')) {
            return {
                feeds: [
                    { id: 1, title: 'Mock Podcast 1', author: 'Author A', description: 'Description 1', image: 'https://picsum.photos/400' },
                    { id: 2, title: 'Mock Podcast 2', author: 'Author B', description: 'Description 2', image: 'https://picsum.photos/401' }
                ]
            };
        }
        if (endpoint.includes('episodes')) {
            return {
                items: [
                    { id: 101, title: 'Mock Episode 1', feedTitle: 'Mock Podcast 1', duration: 1800, datePublished: Date.now()/1000 - 86400, enclosureUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
                    { id: 102, title: 'Mock Episode 2', feedTitle: 'Mock Podcast 1', duration: 3600, datePublished: Date.now()/1000 - 172800, enclosureUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }
                ]
            };
        }
        return {};
    }
}
