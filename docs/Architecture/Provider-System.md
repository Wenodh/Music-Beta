# Provider System

Vibe On uses a unified provider architecture to support multiple audio sources.

## Core Interface: `AudioProvider`

Every provider must implement the `AudioProvider` interface:

```ts
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
```

## Provider Capabilities

Capabilities drive the UI. If a provider doesn't support downloads, the download button will be hidden for its media items.

```ts
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
```

## Current Providers

- **JioSaavn**: Music and radio.
- **Podcast Index**: Podcasts and episodes.
- **Librivox**: Public domain audiobooks.
- **Radio Browser**: Internet radio stations.

## Registration

Providers are registered in the `ProviderRegistry` at application startup.
