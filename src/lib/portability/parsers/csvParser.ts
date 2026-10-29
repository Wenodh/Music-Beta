import { PortableTrack } from '../types';

export interface CsvParseResult {
    tracks: PortableTrack[];
    playlists: { name: string; songs: PortableTrack[] }[];
    errors: string[];
}

/**
 * Parses a CSV string into PortableTrack items and grouped playlists.
 */
export function parseCsv(csvText: string): CsvParseResult {
    const errors: string[] = [];
    if (!csvText || !csvText.trim()) {
        return { tracks: [], playlists: [], errors: ['CSV content is empty.'] };
    }

    // Strip UTF-8 BOM if present
    let cleanText = csvText;
    if (cleanText.charCodeAt(0) === 0xfeff) {
        cleanText = cleanText.slice(1);
    }

    const rows = parseCsvRows(cleanText);
    if (rows.length < 2) {
        return { tracks: [], playlists: [], errors: ['CSV file must contain a header row and at least one data row.'] };
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s\-_]+/g, ''));
    const colIndex = getColumnIndexes(headers);

    if (colIndex.title === -1 && colIndex.artist === -1) {
        return {
            tracks: [],
            playlists: [],
            errors: ['CSV missing required columns. Must contain at least "title" (or "name"/"track") or "artist".'],
        };
    }

    const tracks: PortableTrack[] = [];
    const playlistMap = new Map<string, PortableTrack[]>();

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
            continue; // skip empty lines
        }

        const getVal = (idx: number): string => (idx !== -1 && idx < row.length ? row[idx].trim() : '');

        const title = getVal(colIndex.title) || getVal(colIndex.rawText) || `Track ${r}`;
        const artist = getVal(colIndex.artist) || 'Unknown Artist';
        const album = getVal(colIndex.album) || undefined;
        const duration = getVal(colIndex.duration) || undefined;
        const year = getVal(colIndex.year) || undefined;
        const isrc = getVal(colIndex.isrc) || undefined;
        const provider = getVal(colIndex.provider) || undefined;
        const providerId = getVal(colIndex.providerId) || undefined;
        const sourceUrl = getVal(colIndex.sourceUrl) || undefined;
        const playlistName = getVal(colIndex.playlistName) || undefined;
        const posStr = getVal(colIndex.playlistPosition);
        const playlistPosition = posStr ? parseInt(posStr, 10) : undefined;

        const track: PortableTrack = {
            id: providerId,
            title,
            artist,
            album,
            duration,
            year,
            provider,
            providerId,
            sourceUrl,
            isrc,
            playlistName,
            playlistPosition,
        };

        tracks.push(track);

        if (playlistName) {
            if (!playlistMap.has(playlistName)) {
                playlistMap.set(playlistName, []);
            }
            playlistMap.get(playlistName)!.push(track);
        }
    }

    const playlists = Array.from(playlistMap.entries()).map(([name, songs]) => ({
        name,
        songs,
    }));

    return {
        tracks,
        playlists,
        errors,
    };
}

/**
 * Utility to parse CSV text into a 2D array of strings respecting RFC 4180 quotes.
 */
export function parseCsvRows(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (c === '"') {
                if (next === '"') {
                    cur += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                cur += c;
            }
        } else {
            if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                row.push(cur);
                cur = '';
            } else if (c === '\r') {
                if (next === '\n') i++;
                row.push(cur);
                result.push(row);
                row = [];
                cur = '';
            } else if (c === '\n') {
                row.push(cur);
                result.push(row);
                row = [];
                cur = '';
            } else {
                cur += c;
            }
        }
    }

    if (cur.length > 0 || row.length > 0) {
        row.push(cur);
        result.push(row);
    }

    return result;
}

interface ColumnIndexes {
    title: number;
    artist: number;
    album: number;
    duration: number;
    year: number;
    isrc: number;
    provider: number;
    providerId: number;
    sourceUrl: number;
    playlistName: number;
    playlistPosition: number;
    rawText: number;
}

function getColumnIndexes(headers: string[]): ColumnIndexes {
    const findIndex = (aliases: string[]): number => {
        return headers.findIndex((h) => aliases.includes(h));
    };

    return {
        title: findIndex(['title', 'name', 'song', 'songtitle', 'track', 'trackname']),
        artist: findIndex(['artist', 'artists', 'primaryartist', 'primaryartists', 'performer', 'author']),
        album: findIndex(['album', 'albumname', 'collection']),
        duration: findIndex(['duration', 'length', 'time']),
        year: findIndex(['year', 'releaseyear', 'date']),
        isrc: findIndex(['isrc', 'isrcCode']),
        provider: findIndex(['provider', 'service', 'source']),
        providerId: findIndex(['providerid', 'songid', 'id', 'trackid']),
        sourceUrl: findIndex(['sourceurl', 'url', 'link', 'audiourl']),
        playlistName: findIndex(['playlistname', 'playlist', 'collectionname']),
        playlistPosition: findIndex(['playlistposition', 'position', 'tracknumber', 'trackno', 'index']),
        rawText: findIndex(['query', 'rawtext', 'text']),
    };
}
