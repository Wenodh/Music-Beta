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

export interface MediaItem {
    id: string;
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
