import { MediaItem } from '../audio-sdk/models';

export type RecommendationReasonType = 'genre' | 'artist' | 'creator' | 'history' | 'trending' | 'freshness' | 'diversity';

export interface RecommendationReason {
    type: RecommendationReasonType;
    message: string;
    metadata?: Record<string, any>;
}

export interface Recommendation {
    id: string;
    media: MediaItem;
    score: number;
    reasons: RecommendationReason[];
    module: string; // The module that generated this (e.g., 'daily-mix-1')
}

export interface GenreAffinity {
    genre: string;
    score: number;
    count: number;
}

export interface ArtistAffinity {
    id: string;
    name: string;
    score: number;
    count: number;
}

export interface TasteProfile {
    userId?: string;
    topGenres: GenreAffinity[];
    topArtists: ArtistAffinity[];
    preferredLanguages: string[];
    listeningTimeTotal: number; // seconds
    skipRate: number; // 0-1
    averageCompletionRate: number; // 0-1
    timeOfDayAffinity: Record<number, number>; // Hour (0-23) -> Score
    lastUpdated: string;
    version: number;
}

export interface ListeningEvent {
    id: string;
    mediaId: string;
    provider: string;
    type: string;
    action: 'play' | 'pause' | 'skip' | 'complete' | 'seek';
    timestamp: string;
    duration: number; // duration of the action in seconds
    position?: number;
    metadata: Record<string, any>;
}
