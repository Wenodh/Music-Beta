import { providerRegistry, SearchOptions } from './registry';
import { MediaItem, PlayableSource } from './models';
import { globalCache } from '../cache';
import { JioSaavnProvider } from './providers/jiosaavn';

export class AudioSDK {
    private static instance: AudioSDK;

    private constructor() {
        providerRegistry.registerProvider(new JioSaavnProvider());
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
            const providers = providerRegistry.listProviders();
            const results = await Promise.all(
                providers.map(p => p.search(query, options).catch(() => []))
            );
            return results.flat();
        });
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
