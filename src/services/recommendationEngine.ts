import { Song } from '../types/music';

export interface ScoredRecommendation {
    song: Song;
    score: number;
    reason: string;
}

export interface RecommendationSignals {
    favorites: Song[];
    recentlyPlayed: Song[];
    dismissedSongIds?: string[];
    topArtistAffinity?: { [artist: string]: number };
}

/**
 * Deterministic recommendation scoring engine.
 * Calculates composite relevance score based on:
 * - Artist Affinity (weight: 3.5)
 * - Favorite Artist Bonus (weight: 2.0)
 * - Recency Affinity (weight: 1.5)
 * - Diversity Penalty (prevents single-artist domination)
 */
export class RecommendationEngine {
    private dismissedIds: Set<string> = new Set();

    constructor(initialDismissedIds?: string[]) {
        if (initialDismissedIds) {
            this.dismissedIds = new Set(initialDismissedIds);
        }
    }

    public dismissSong(songId: string): void {
        this.dismissedIds.add(songId);
    }

    public getDismissedIds(): string[] {
        return Array.from(this.dismissedIds);
    }

    public scoreCandidates(
        candidates: Song[],
        signals: RecommendationSignals,
        limit = 20
    ): ScoredRecommendation[] {
        if (!candidates || candidates.length === 0) return [];

        // Build artist affinity map from favorites & recently played
        const artistAffinityMap = new Map<string, number>();

        // 1. Calculate weights from favorites (+5 points per favorite)
        for (const fav of signals.favorites) {
            const artists = this.extractArtists(fav.primaryArtists);
            for (const a of artists) {
                artistAffinityMap.set(a, (artistAffinityMap.get(a) || 0) + 5);
            }
        }

        // 2. Calculate weights from recently played (+3 down to +1 for recency)
        signals.recentlyPlayed.slice(0, 15).forEach((recent, index) => {
            const weight = Math.max(1, 3 - Math.floor(index / 5));
            const artists = this.extractArtists(recent.primaryArtists);
            for (const a of artists) {
                artistAffinityMap.set(a, (artistAffinityMap.get(a) || 0) + weight);
            }
        });

        // Track artist counts to apply diversity penalty
        const artistSelectionCount = new Map<string, number>();

        const scored: ScoredRecommendation[] = [];

        for (const song of candidates) {
            if (!song || !song.id) continue;
            // Exclude already dismissed or recent songs from direct recommendations unless low candidates
            if (this.dismissedIds.has(song.id)) continue;

            const songArtists = this.extractArtists(song.primaryArtists);
            let score = 1.0; // Baseline novelty score
            let primaryReason = 'Recommended for you';

            // Check artist affinity
            let highestAffinity = 0;
            let matchedArtist = '';

            for (const a of songArtists) {
                const affinity = artistAffinityMap.get(a) || 0;
                if (affinity > highestAffinity) {
                    highestAffinity = affinity;
                    matchedArtist = a;
                }
            }

            if (highestAffinity > 0) {
                score += highestAffinity * 2.5;
                primaryReason = `Because you like ${matchedArtist}`;
            }

            // Apply diversity penalty if artist was already picked multiple times
            const occurrences = artistSelectionCount.get(matchedArtist) || 0;
            if (occurrences > 0) {
                score *= Math.pow(0.7, occurrences);
            }

            scored.push({
                song,
                score,
                reason: primaryReason,
            });
        }

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score);

        // Pick top recommendations with diversity capping
        const results: ScoredRecommendation[] = [];
        for (const item of scored) {
            const mainArtist = this.extractArtists(item.song.primaryArtists)[0] || 'Unknown';
            const count = artistSelectionCount.get(mainArtist) || 0;
            if (count < 3 || results.length >= limit) {
                artistSelectionCount.set(mainArtist, count + 1);
                results.push(item);
            }
            if (results.length >= limit) break;
        }

        return results;
    }

    private extractArtists(artistString?: string): string[] {
        if (!artistString) return [];
        return artistString
            .split(/[,&/|]/)
            .map(a => a.trim().toLowerCase())
            .filter(Boolean);
    }
}

export const recommendationEngine = new RecommendationEngine();
