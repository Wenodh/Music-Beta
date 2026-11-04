import { Song } from '../types/music';

export type SmartPlaylistRuleType =
    | 'recently_played'
    | 'most_played'
    | 'favorites'
    | 'artist_contains'
    | 'downloaded'
    | 'duration_greater_than'
    | 'duration_less_than';

export interface SmartPlaylistRule {
    type: SmartPlaylistRuleType;
    value?: string | number;
}

export interface SmartPlaylistDefinition {
    id: string;
    name: string;
    description?: string;
    operator: 'AND' | 'OR';
    rules: SmartPlaylistRule[];
    limit?: number;
    sortBy?: 'date_added' | 'title' | 'duration' | 'artist';
    sortOrder?: 'asc' | 'desc';
    createdAt: number;
    updatedAt: number;
}

export interface EvaluationContext {
    favorites: Song[];
    recentlyPlayed: Song[];
    downloadedSongs: Song[];
    playCounts?: { [songId: string]: number };
}

/**
 * Smart Playlist Engine: Evaluates dynamic virtual playlists against local library data.
 */
export class SmartPlaylistEngine {
    public evaluate(
        definition: SmartPlaylistDefinition,
        context: EvaluationContext
    ): Song[] {
        // Build universal candidate pool from context (deduplicated)
        const candidateMap = new Map<string, Song>();
        [
            ...context.favorites,
            ...context.recentlyPlayed,
            ...context.downloadedSongs
        ].forEach(s => {
            if (s && s.id) candidateMap.set(s.id, s);
        });

        const candidates = Array.from(candidateMap.values());
        if (candidates.length === 0 || definition.rules.length === 0) {
            return [];
        }

        const favIds = new Set(context.favorites.map(f => f.id));
        const recentIds = new Set(context.recentlyPlayed.map(r => r.id));
        const downloadedIds = new Set(context.downloadedSongs.map(d => d.id));

        const matched = candidates.filter(song => {
            const ruleResults = definition.rules.map(rule => {
                switch (rule.type) {
                    case 'favorites':
                        return favIds.has(song.id);
                    case 'recently_played':
                        return recentIds.has(song.id);
                    case 'downloaded':
                        return downloadedIds.has(song.id);
                    case 'artist_contains':
                        if (!rule.value) return true;
                        return song.primaryArtists.toLowerCase().includes(String(rule.value).toLowerCase());
                    case 'duration_greater_than':
                        return Number(song.duration) >= Number(rule.value || 0);
                    case 'duration_less_than':
                        return Number(song.duration) <= Number(rule.value || Infinity);
                    case 'most_played': {
                        const count = context.playCounts?.[song.id] || 0;
                        return count >= Number(rule.value || 1);
                    }
                    default:
                        return true;
                }
            });

            return definition.operator === 'AND'
                ? ruleResults.every(Boolean)
                : ruleResults.some(Boolean);
        });

        // Sorting
        if (definition.sortBy) {
            matched.sort((a, b) => {
                let comp = 0;
                if (definition.sortBy === 'title') {
                    comp = a.name.localeCompare(b.name);
                } else if (definition.sortBy === 'artist') {
                    comp = (a.primaryArtists || '').localeCompare(b.primaryArtists || '');
                } else if (definition.sortBy === 'duration') {
                    comp = Number(a.duration) - Number(b.duration);
                }
                return definition.sortOrder === 'desc' ? -comp : comp;
            });
        }

        // Limit
        if (definition.limit && definition.limit > 0) {
            return matched.slice(0, definition.limit);
        }

        return matched;
    }
}

export const smartPlaylistEngine = new SmartPlaylistEngine();
