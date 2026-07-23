import { AudioProvider, SearchOptions, ProviderCapabilities, ProviderInfo } from '../registry';
import { MediaItem, PlayableSource } from '../models';
import { logger } from '../../logger';

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
        // If credentials are "use-edge-function", call Supabase Edge Function
        if (this.config.apiKey === 'use-edge-function') {
            try {
                const { supabase } = await import('../../supabase');
                const { data, error } = await supabase.functions.invoke('podcast-index', {
                    body: { endpoint, params },
                    signal
                });
                if (error) throw error;
                return data;
            } catch (err) {
                logger.error('PodcastIndex Edge Function invocation failed, falling back to mock:', err);
                return this.getMockResponse(endpoint, params);
            }
        }

        // If credentials are missing, use mock response
        if (!this.config.apiKey || !this.config.apiSecret) {
            return this.getMockResponse(endpoint, params);
        }

        // Direct authenticated client-side fetch (with SHA-1 signing)
        try {
            const apiKey = this.config.apiKey;
            const apiSecret = this.config.apiSecret;
            const apiHeaderTime = Math.floor(Date.now() / 1000);

            // Generate SHA-1 authorization signature
            const sha1 = async (message: string) => {
                const msgUint8 = new TextEncoder().encode(message);
                const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            };

            const authorization = await sha1(apiKey + apiSecret + apiHeaderTime);

            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                queryParams.append(key, String(value));
            });

            const url = `${this.config.baseUrl}/${endpoint}?${queryParams.toString()}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'VibeOn/1.0.0',
                    'X-Auth-Key': apiKey,
                    'X-Auth-Date': String(apiHeaderTime),
                    'Authorization': authorization
                },
                signal
            });

            if (!response.ok) {
                throw new Error(`Podcast Index API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            logger.error('PodcastIndexProvider direct API fetch failed, falling back to mock:', error);
            return this.getMockResponse(endpoint, params);
        }
    }

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        const results = await this.fetchApi('search/byterm', {
            q: query,
            max: options?.limit || 20,
            page: options?.page || 0
        }, options?.signal);
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

    public getMockResponse(endpoint: string, params: any): any {
        // Deterministic, realistic mock dataset of 50 items
        const MOCK_PODCASTS = Array.from({ length: 50 }, (_, i) => {
            const id = i + 1;
            return {
                id,
                title: `Vibe On Podcast ${id}: The Future of ${['Music', 'Technology', 'Science', 'Culture', 'Space', 'Design'][id % 6]}`,
                author: `Host ${String.fromCharCode(65 + (id % 26))}`,
                description: `Welcome to episode ${id} of our weekly show where we talk about ${['music engineering', 'artificial intelligence', 'quantum physics', 'modern philosophy', 'space exploration', 'sustainable design'][id % 6]}. Explore deep ideas, amazing stories, and current insights.`,
                image: `https://picsum.photos/id/${(10 + id) % 1000}/400/400`,
                language: ['en', 'es', 'fr', 'de'][id % 4],
                categories: { [id % 3]: ['Technology', 'Science', 'Society'][id % 3] },
                episodeCount: 15
            };
        });

        const getMockEpisodesForPodcast = (podcastId: number) => {
            return Array.from({ length: 15 }, (_, i) => {
                const episodeId = podcastId * 100 + (i + 1);
                return {
                    id: episodeId,
                    feedId: podcastId,
                    title: `Episode ${i + 1}: ${['Unlocking Secrets', 'Solving Paradoxes', 'Next-Gen Architectures', 'The Human Factor', 'Creative Breakthroughs'][i % 5]} in ${['Music', 'Technology', 'Science', 'Culture', 'Space', 'Design'][podcastId % 6]}`,
                    feedTitle: `Vibe On Podcast ${podcastId}`,
                    description: `In this episode, we dive deep into the fascinating details of how we approach ${['music', 'technology', 'science', 'culture', 'space', 'design'][podcastId % 6]} in the modern world. Featuring interviews, discussions, and a comprehensive breakdown of major topics.`,
                    duration: 1200 + (i * 300) + (podcastId * 60), // deterministic duration between 20 mins and 2 hours
                    datePublished: Math.floor(Date.now() / 1000) - (15 - i) * 86400 - (podcastId * 3600), // published over the last 15 days
                    enclosureUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(episodeId % 16) + 1}.mp3`,
                    enclosureType: 'audio/mpeg',
                    image: `https://picsum.photos/id/${(100 + episodeId) % 1000}/400/400`
                };
            });
        };

        if (endpoint.includes('search')) {
            const query = (params.q || '').toLowerCase().trim();
            let filtered = query
                ? MOCK_PODCASTS.filter(p =>
                    p.title.toLowerCase().includes(query) ||
                    p.author.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query) ||
                    (query === 'english' && p.language === 'en') ||
                    (query === 'spanish' && p.language === 'es') ||
                    (query === 'french' && p.language === 'fr') ||
                    (query === 'german' && p.language === 'de')
                  )
                : MOCK_PODCASTS;

            if (filtered.length === 0) {
                filtered = MOCK_PODCASTS;
            }

            const limit = Number(params.max) || 20;
            const page = Number(params.page) || 0;
            const offset = page * limit;
            const sliced = filtered.slice(offset, offset + limit);

            return { feeds: sliced };
        }

        if (endpoint.includes('recent/feeds')) {
            const limit = Number(params.max) || 20;
            return { feeds: MOCK_PODCASTS.slice(0, limit) };
        }

        if (endpoint.includes('podcasts/byfeedid')) {
            const id = Number(params.id) || 1;
            const feed = MOCK_PODCASTS.find(p => p.id === id) || MOCK_PODCASTS[0];
            return { feed };
        }

        if (endpoint.includes('episodes/byfeedid')) {
            const podcastId = Number(params.id) || 1;
            const episodes = getMockEpisodesForPodcast(podcastId);
            const limit = Number(params.max) || 100;
            return { items: episodes.slice(0, limit) };
        }

        if (endpoint.includes('episodes/byid')) {
            const id = Number(params.id) || 101;
            const podcastId = Math.floor(id / 100) || 1;
            const episodes = getMockEpisodesForPodcast(podcastId);
            const episode = episodes.find(e => e.id === id) || episodes[0];
            return { episode };
        }

        return {};
    }
}
