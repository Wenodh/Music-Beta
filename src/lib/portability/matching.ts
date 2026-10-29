import { Song } from '../../types/music';
import { PortableTrack } from './types';

export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/\([^)]*\)/g, '') // remove parenthetical expressions e.g. (From "Jawan")
        .replace(/\[[^\]]*\]/g, '') // remove bracketed expressions e.g. [HD]
        .replace(/\b(official|video|audio|lyric|lyrics|full|song|hd|4k|remix|feat|ft)\b/gi, '')
        .replace(/[^\w\s]/gi, '') // remove punctuation
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Checks if two strings are a strong match (exact or normalized exact match).
 */
export function isStrongMatch(a: string, b: string): boolean {
    const normA = normalizeString(a);
    const normB = normalizeString(b);
    if (!normA || !normB) return false;
    return normA === normB;
}

/**
 * Attempts to match a PortableTrack against a target library catalog or existing songs.
 * Returns the matched Song, or undefined if unmatched/ambiguous.
 */
export function matchTrackAgainstCatalog(track: PortableTrack, catalog: Song[]): Song | undefined {
    if (!catalog || catalog.length === 0) return track.matchedSong;

    // 1. Priority: Exact provider + provider ID
    if (track.providerId) {
        const exactIdMatch = catalog.find((s) => s.id === track.providerId);
        if (exactIdMatch) return exactIdMatch;
    }

    // 2. Priority: ISRC match
    if (track.isrc) {
        const isrcMatch = catalog.find((s) => (s as any).isrc === track.isrc);
        if (isrcMatch) return isrcMatch;
    }

    // 3. Priority: Strong Title + Artist match
    const candidateMatches = catalog.filter((s) => {
        const songTitle = s.name || s.title || '';
        const songArtist = s.primaryArtists || '';
        return isStrongMatch(track.title, songTitle) && isStrongMatch(track.artist, songArtist);
    });

    if (candidateMatches.length === 1) {
        return candidateMatches[0];
    }

    // If multiple candidates match, do not arbitrarily pick one (ambiguous)
    if (candidateMatches.length > 1) {
        // Try breaking tie with duration if available
        if (track.duration) {
            const trackDur = typeof track.duration === 'number' ? track.duration : parseInt(String(track.duration), 10);
            if (!isNaN(trackDur) && trackDur > 0) {
                const durMatch = candidateMatches.find((s) => {
                    const sDur = typeof s.duration === 'number' ? s.duration : parseInt(String(s.duration), 10);
                    return !isNaN(sDur) && Math.abs(sDur - trackDur) <= 3; // within 3 seconds
                });
                if (durMatch) return durMatch;
            }
        }
    }

    return track.matchedSong;
}

/**
 * Converts an unmatched PortableTrack into a safe placeholder Song object so metadata is never lost.
 */
export function createUnresolvedSong(track: PortableTrack): Song {
    const fallbackId = track.providerId
        ? `unresolved_${track.provider || 'ext'}_${track.providerId}`
        : `unresolved_${crypto.randomUUID()}`;

    return {
        id: fallbackId,
        name: track.title,
        title: track.title,
        primaryArtists: track.artist,
        duration: track.duration || 0,
        image: track.artworkUrl || '/vibeon-logo.png',
        downloadUrl: track.sourceUrl || '',
        album: track.album ? { id: '', name: track.album } : undefined,
        year: track.year,
        type: track.provider || 'external_unresolved',
    };
}
