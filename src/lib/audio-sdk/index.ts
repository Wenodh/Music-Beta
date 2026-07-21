import { providerRegistry, SearchOptions } from './registry';
import { MediaItem, PlayableSource } from './models';
import { globalCache } from '../cache';
import { JioSaavnProvider } from './providers/jiosaavn';
import { RadioBrowserProvider } from './providers/radio-browser';
import { PodcastIndexProvider } from './providers/podcast-index';
import { LibriVoxProvider } from './providers/librivox';
import { OpenLibraryProvider } from './providers/open-library';
import { audiobookDiscoveryService } from './services/AudiobookDiscoveryService';

export class AudioSDK {
    private static instance: AudioSDK;

    private constructor() {
        providerRegistry.registerProvider(new JioSaavnProvider());
        providerRegistry.registerProvider(new RadioBrowserProvider());
        providerRegistry.registerProvider(new PodcastIndexProvider());

        const librivox = new LibriVoxProvider();
        providerRegistry.registerProvider(librivox);

        const openLibrary = new OpenLibraryProvider();
        audiobookDiscoveryService.registerMetadataProvider(openLibrary);
        audiobookDiscoveryService.registerAudiobookProvider(librivox);
    }

    public static getInstance(): AudioSDK {
        if (!AudioSDK.instance) {
            AudioSDK.instance = new AudioSDK();
        }
        return AudioSDK.instance;
    }

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        const cacheKey = `search_${query}_${JSON.stringify(options)}`;
        return globalCache.wrap(cacheKey, async () => {
            let providers = providerRegistry.listProviders();

            // If a specific type is requested, filter providers
            if (options?.type) {
                providers = providers.filter(p => p.supportedTypes.includes(options.type!));
            }

            const results = await Promise.all(
                providers.map(p => p.search(query, options).catch(() => []))
            );

            let flatResults = results.flat();

            // Fallback for Radio: if search returns nothing, get popular
            if (options?.type === 'radio' && flatResults.length === 0) {
                const radioProvider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
                if (radioProvider) {
                    flatResults = await radioProvider.getPopular(options.limit || 20, {
                        page: options.page || 0,
                        signal: options.signal
                    });
                }
            }

            // Unified Library Deduplication Logic
            return this.deduplicateSearchResults(flatResults);
        });
    }

    public deduplicateSearchResults(results: MediaItem[]): MediaItem[] {
        const canonicalMap = new Map<string, MediaItem>();

        results.forEach(item => {
            // Priority 1: Use canonicalId if available
            // Priority 2: Use provider + id for uniqueness
            // Priority 3: Fallback to type + title + subtitle for fuzzy deduplication
            let key = item.canonicalId || `${item.provider}:${item.id}`;

            if (item.type === 'song') {
                // Cross-provider deduplication for songs using normalized title + subtitle
                const titleKey = item.title.toLowerCase().trim();
                const subtitleKey = item.subtitle?.toLowerCase().trim() || '';
                key = `song_${titleKey}_${subtitleKey}`;
            } else if (item.provider === 'radio-browser') {
                key = `radio:${item.id}`;
            }

            if (canonicalMap.has(key)) {
                const existing = canonicalMap.get(key)!;
                if (!existing.sources) {
                    existing.sources = [{
                        provider: existing.provider,
                        id: existing.id,
                        playable: existing.playable,
                        availability: 'available',
                        stream: existing.stream
                    }];
                }

                // Add source if it doesn't already exist from this provider
                if (!existing.sources.some(s => s.provider === item.provider)) {
                    existing.sources.push({
                        provider: item.provider,
                        id: item.id,
                        playable: item.playable,
                        availability: 'available',
                        stream: item.stream
                    });
                }
            } else {
                const newItem = { ...item };
                if (!newItem.sources) {
                    newItem.sources = [{
                        provider: item.provider,
                        id: item.id,
                        playable: item.playable,
                        availability: 'available',
                        stream: item.stream
                    }];
                }
                canonicalMap.set(key, newItem);
            }
        });

        return Array.from(canonicalMap.values());
    }

    async getMedia(id: string, providerId: string, type: string): Promise<MediaItem | undefined> {
        const cacheKey = `media_${providerId}_${type}_${id}`;
        return globalCache.wrap(cacheKey, async () => {
            const provider = providerRegistry.getProvider(providerId);
            if (!provider) return undefined;
            return provider.getMedia(id, type);
        });
    }

    async getRecommendations(id: string, providerId: string): Promise<MediaItem[]> {
        const cacheKey = `recommendations_${providerId}_${id}`;
        return globalCache.wrap(cacheKey, async () => {
            const provider = providerRegistry.getProvider(providerId);
            if (!provider) return [];
            return provider.getRecommendations(id);
        });
    }

    // Podcast Specific Methods
    async searchPodcasts(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('podcast-index') as PodcastIndexProvider;
        if (!provider) return [];
        return provider.search(query, options);
    }

    async searchEpisodes(query: string, limit: number = 20): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('podcast-index') as PodcastIndexProvider;
        if (!provider) return [];
        return provider.searchEpisodes(query, limit);
    }

    async getPodcast(id: string): Promise<MediaItem | undefined> {
        const provider = providerRegistry.getProvider('podcast-index') as PodcastIndexProvider;
        if (!provider) return undefined;
        return provider.getMedia(id, 'podcast');
    }

    async getEpisode(id: string): Promise<MediaItem | undefined> {
        const provider = providerRegistry.getProvider('podcast-index') as PodcastIndexProvider;
        if (!provider) return undefined;
        return provider.getMedia(id, 'episode');
    }

    async getEpisodes(podcastId: string, limit: number = 100): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('podcast-index') as PodcastIndexProvider;
        if (!provider) return [];
        return provider.getEpisodes(podcastId, limit);
    }

    async getTrendingPodcasts(limit: number = 20): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('podcast-index') as PodcastIndexProvider;
        if (!provider) return [];
        return provider.getTrending(limit);
    }

    async getPopularRadio(limit: number = 20): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
        if (!provider) return [];
        return provider.getPopular(limit);
    }

    async getTrendingRadio(limit: number = 20): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
        if (!provider) return [];
        return provider.getTrending(limit);
    }

    // Audiobook Specific Methods
    async searchAudiobooks(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        return audiobookDiscoveryService.searchAudiobooks(query, options);
    }

    async getAudiobook(id: string): Promise<MediaItem | undefined> {
        const provider = providerRegistry.getProvider('librivox') as LibriVoxProvider;
        if (!provider) return undefined;
        return provider.getMedia(id, 'audiobook');
    }

    async getChapters(bookId: string): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('librivox') as LibriVoxProvider;
        if (!provider) return [];
        return provider.getChapters(bookId);
    }

    async getPopularAudiobooks(limit: number = 20): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('librivox') as LibriVoxProvider;
        if (!provider) return [];
        return provider.getPopular(limit);
    }

    async getRecentAudiobooks(limit: number = 20): Promise<MediaItem[]> {
        const provider = providerRegistry.getProvider('librivox') as LibriVoxProvider;
        if (!provider) return [];
        return provider.getRecent(limit);
    }

    async getPlayableSource(item: MediaItem, quality?: string): Promise<PlayableSource | undefined> {
        // First try to resolve from metadata if it contains the URL already
        const metadata = item.metadata as Record<string, unknown>;
        const preferredQuality = quality || '320kbps';

        // Quality mapping
        const musicData = metadata.music || metadata.downloadUrl;
        let url = '';
        if (Array.isArray(musicData)) {
            url = (musicData as any[]).find((d: any) => d.quality === preferredQuality)?.url || (musicData as any[])[(musicData as any[]).length - 1]?.url;
        } else {
            url = (musicData as string) || '';
        }

        if (url) {
            return {
                url,
                format: 'mp3',
                bitrate: parseInt(preferredQuality) || 320
            };
        }

        const provider = providerRegistry.getProvider(item.provider);
        if (!provider) return undefined;

        return provider.getPlayableSource(item.id, quality);
    }
}

export const audioSDK = AudioSDK.getInstance();
