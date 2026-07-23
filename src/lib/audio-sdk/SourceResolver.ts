import { MediaItem, MediaSource } from './models';
import { accountLinkingService } from '../auth/AccountLinkingService';

export interface SourceResolutionOptions {
    preferOffline?: boolean;
    preferredQuality?: string;
    allowedProviders?: string[];
}

export class SourceResolver {
    private static instance: SourceResolver;

    private constructor() {}

    public static getInstance(): SourceResolver {
        if (!SourceResolver.instance) {
            SourceResolver.instance = new SourceResolver();
        }
        return SourceResolver.instance;
    }

    public async resolveSource(item: MediaItem, options?: SourceResolutionOptions): Promise<MediaSource | null> {
        let sources = item.sources || [];

        // If no sources explicitly defined, the item itself is a source
        if (sources.length === 0) {
            sources = [{
                provider: item.provider,
                id: item.id,
                playable: item.playable,
                stream: item.stream,
                availability: 'available'
            }];
        }

        // Filter by linked accounts and allowed providers
        const linkedProviderIds = accountLinkingService.getAccounts()
            .filter(a => a.status === 'connected')
            .map(a => a.providerId);

        // Include default built-in providers that don't require explicit linking
        const builtInProviders = ['radio-browser', 'podcast-index', 'librivox', 'jiosaavn'];
        const activeProviderIds = [...linkedProviderIds, ...builtInProviders];

        let availableSources = sources.filter(s => activeProviderIds.includes(s.provider));

        if (options?.allowedProviders) {
            availableSources = availableSources.filter(s => options.allowedProviders!.includes(s.provider));
        }

        if (availableSources.length === 0) return null;

        // Source Ranking Logic
        const sortedSources = availableSources.sort((a, b) => {
            // Local provider usually highest priority
            if (a.provider === 'local') return -1;
            if (b.provider === 'local') return 1;

            // Then check availability
            if (a.availability === 'available' && b.availability !== 'available') return -1;
            if (b.availability === 'available' && a.availability !== 'available') return 1;

            return 0;
        });

        return sortedSources[0];
    }
}

export const sourceResolver = SourceResolver.getInstance();
