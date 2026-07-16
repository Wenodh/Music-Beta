import { MediaItem, PlayableSource } from './models';

export interface SearchOptions {
    page?: number;
    limit?: number;
    type?: string;
    signal?: AbortSignal;
}

export interface ProviderCapabilities {
    search: boolean;
    recommendations: boolean;
    favorites: boolean;
    history: boolean;
    downloads: boolean;
    resumableDownloads?: boolean;
    offlinePlayback?: boolean;
    cloudSync?: boolean;
    continueListening: boolean;
    streaming: boolean;
    live: boolean;
    lyrics: boolean;
    speedControl: boolean;
    authentication: boolean;
}

export interface ProviderInfo {
    id: string;
    displayName: string;
    icon?: string;
    website?: string;
    version?: string;
    supportsOffline: boolean;
    supportsStreaming: boolean;
}

export interface AudioProvider {
    readonly id: string;
    readonly name: string;
    readonly supportedTypes: string[];
    readonly capabilities: ProviderCapabilities;
    readonly info: ProviderInfo;

    search(query: string, options?: SearchOptions): Promise<MediaItem[]>;
    getMedia(id: string, type: string): Promise<MediaItem>;
    getRecommendations(id: string): Promise<MediaItem[]>;
    getPlayableSource(id: string, quality?: string): Promise<PlayableSource>;
}

export class ProviderRegistry {
    private providers: Map<string, AudioProvider> = new Map();

    registerProvider(provider: AudioProvider): void {
        this.providers.set(provider.id, provider);
    }

    getProvider(id: string): AudioProvider | undefined {
        return this.providers.get(id);
    }

    listProviders(): AudioProvider[] {
        return Array.from(this.providers.values());
    }

    getProviderByMediaType(type: string): AudioProvider | undefined {
        return this.listProviders().find(p => p.supportedTypes.includes(type));
    }
}

export const providerRegistry = new ProviderRegistry();
