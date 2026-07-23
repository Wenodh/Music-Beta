# Audio SDK Architecture

The Audio SDK is a unified abstraction layer for accessing multiple audio content providers.

## Core Interface: `AudioProvider`

Every provider (JioSaavn, PodcastIndex, LibriVox, etc.) must implement the `AudioProvider` interface:

```typescript
interface AudioProvider {
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
```

## Subsystems

### Provider Registry
A central registry where all available providers are registered. The UI and managers query the registry to find providers for specific media types or by ID.

### Unified Search
`AudioSDK.search()` performs concurrent searches across all relevant providers and deduplicates results into a unified list of `MediaItem` objects.

### Source Resolution
Translates a `MediaItem` into a `PlayableSource` (URL, format, bitrate) by querying the item's originating provider.

### Health Manager
Monitors provider performance and availability, marking providers as degraded if they repeatedly fail or time out.

## Canonical Model: `MediaItem`

All providers must map their internal data structures to the `MediaItem` model. This ensures the rest of the application (UI, Playback, Sync) remains provider-agnostic.

```typescript
interface MediaItem {
    id: string;
    provider: string;
    type: 'song' | 'album' | 'artist' | 'podcast' | 'episode' | 'audiobook' | 'radio';
    title: string;
    artwork: Artwork[];
    playable: boolean;
    metadata: Record<string, unknown>;
    // ...
}
```
