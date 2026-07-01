export interface Artwork {
    url: string;
    quality?: string;
}

export interface PlayableSource {
    url: string;
    format: 'mp3' | 'aac' | 'hls';
    mimeType?: string;
    bitrate?: number;
    headers?: Record<string, string>;
    drm?: boolean;
    expiresAt?: string;
}

export type MediaItemType =
    | 'song'
    | 'album'
    | 'artist'
    | 'podcast'
    | 'episode'
    | 'audiobook'
    | 'chapter'
    | 'radio';

export interface SyncMetadata {
    uuid: string;
    version: number;
    updatedAt: string;
    deviceId: string;
    deletedAt?: string;
}

export interface MediaSource {
    provider: string;
    id: string;
    playable: boolean;
    stream?: PlayableSource;
    quality?: string;
    availability: 'available' | 'unavailable' | 'restricted';
}

export interface MediaItem {
    id: string; // This can be the provider-specific ID or a canonical ID
    provider: string;
    type: MediaItemType;
    title: string;
    subtitle?: string;
    description?: string;
    artwork: Artwork[]; // Supporting multiple qualities as per existing pattern
    playable: boolean;
    duration?: number;
    stream?: PlayableSource;
    explicit?: boolean;
    language?: string;
    genres?: string[];
    publishedAt?: string;
    metadata: Record<string, unknown>;
    sync?: SyncMetadata;
    canonicalId?: string;
    sources?: MediaSource[];
    creatorId?: string;
    organizationId?: string;
    accessPolicy?: AccessPolicy;
    assets?: MediaAsset[];
}

export interface AccessPolicy {
    type: 'free' | 'premium' | 'subscriber' | 'purchase';
    tierId?: string;
    price?: number;
    currency?: string;
}

export interface MediaAsset {
    id: string;
    type: 'audio' | 'artwork' | 'transcript' | 'chapters' | 'waveform';
    url: string;
    quality?: string;
    format?: string;
    size?: number;
    status: 'pending' | 'processing' | 'ready' | 'error';
}

export interface CanonicalMediaItem extends Omit<MediaItem, 'provider' | 'stream'> {
    sources: MediaSource[];
    primarySource: string; // Provider ID
}

export interface QueueItem {
    mediaItem: MediaItem;
    addedAt: number;
    context?: string;
}

export interface HistoryItem {
    id: string; // UUID for sync, or composite ID for legacy
    mediaItem: MediaItem;
    playedAt: string | number;
    listenedDuration: number;
    completionPercentage?: number;
    source?: string;
    sync?: SyncMetadata;
}

export interface FavoriteItem {
    id: string; // UUID for sync, or composite ID for legacy
    mediaItem: MediaItem;
    provider: string;
    contentType: MediaItemType;
    createdAt: number;
    sync?: SyncMetadata;
}

export interface Bookmark {
    id: string;
    mediaId: string;
    provider: string;
    chapterId?: string;
    position: number;
    title?: string;
    note?: string;
    createdAt: string;
    sync?: SyncMetadata;
}

export interface PlaybackPosition {
    mediaId: string;
    provider: string;
    position: number;
    duration: number;
    playbackSpeed: number;
    updatedAt: string;
    sync?: SyncMetadata;
}

export type PlaybackState = 'idle' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';
