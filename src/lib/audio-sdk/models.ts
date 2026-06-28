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
}

export interface QueueItem {
    mediaItem: MediaItem;
    addedAt: number;
    context?: string;
}

export interface HistoryItem {
    id: string; // Composite ID: provider_type_id
    mediaItem: MediaItem;
    playedAt: string | number;
    listenedDuration: number;
    completionPercentage: number;
    source?: string;
}

export interface FavoriteItem {
    id: string; // Composite ID: provider_type_id
    mediaItem: MediaItem;
    provider: string;
    contentType: MediaItemType;
    createdAt: number;
}

export interface Bookmark {
    id: string;
    mediaId: string;
    chapterId: string;
    position: number;
    title?: string;
    note?: string;
    createdAt: string;
}

export type PlaybackState = 'idle' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';
