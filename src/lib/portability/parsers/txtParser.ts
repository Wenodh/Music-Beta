import { PortableTrack } from '../types';

export interface TxtParseResult {
    tracks: PortableTrack[];
    errors: string[];
}

/**
 * Parses line-based text lists into PortableTrack items.
 */
export function parseTxt(txtContent: string): TxtParseResult {
    if (!txtContent || !txtContent.trim()) {
        return { tracks: [], errors: ['TXT content is empty.'] };
    }

    const lines = txtContent.split(/\r?\n/);
    const tracks: PortableTrack[] = [];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) {
            continue; // skip comments and empty lines
        }

        // Clean up prefix track numbering e.g. "1. ", "01. ", "1 - ", "01 - "
        const cleanedLine = line.replace(/^(?:\d+[.)]\s*|\d+\s*[-–—]\s*)/, '').trim();

        const track = parseTxtLine(cleanedLine, line);
        if (track) {
            tracks.push(track);
        }
    }

    return {
        tracks,
        errors: tracks.length === 0 ? ['No valid song lines found in TXT file.'] : [],
    };
}

/**
 * Parses a single text line into artist and title.
 * Default assumption: "Artist - Title" (standard music track naming convention).
 */
export function parseTxtLine(cleanedLine: string, originalLine: string): PortableTrack {
    let artist = 'Unknown Artist';
    let title = cleanedLine;

    // Check for delimiter " - ", " – ", " — "
    const dashMatch = cleanedLine.split(/\s*[-–—]\s*/);
    if (dashMatch.length >= 2) {
        artist = dashMatch[0].trim();
        title = dashMatch.slice(1).join(' - ').trim();
    } else {
        // Fallback tab or pipe delimiter
        const tabMatch = cleanedLine.split(/[\t|]/);
        if (tabMatch.length >= 2) {
            artist = tabMatch[0].trim();
            title = tabMatch[1].trim();
        }
    }

    return {
        title: title || originalLine,
        artist: artist || 'Unknown Artist',
        rawText: originalLine,
    };
}
