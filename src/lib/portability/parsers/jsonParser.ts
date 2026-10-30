import { VibeOnBackupEnvelope, PortableTrack } from '../types';
import { validateVibeOnBackupSchema } from '../schema';
import { Song } from '../../../types/music';

export interface JsonParseResult {
    envelope?: VibeOnBackupEnvelope;
    tracks: PortableTrack[];
    playlists: { name: string; songs: PortableTrack[] }[];
    isVibeOnFormat: boolean;
    errors: string[];
}

/**
 * Parses JSON content for Vibe On native backups or external song lists.
 */
export function parseJsonBackup(content: string): JsonParseResult {
    const errors: string[] = [];
    let parsed: any;

    try {
        parsed = JSON.parse(content.trim());
    } catch (err: any) {
        return {
            tracks: [],
            playlists: [],
            isVibeOnFormat: false,
            errors: [`JSON parse error: ${err.message || 'Invalid JSON syntax'}`],
        };
    }

    // Check if it's a Vibe On envelope
    if (parsed && typeof parsed === 'object' && parsed.format === 'vibeon-library') {
        const validation = validateVibeOnBackupSchema(parsed);
        if (!validation.valid) {
            return {
                envelope: parsed,
                tracks: [],
                playlists: [],
                isVibeOnFormat: true,
                errors: validation.errors,
            };
        }

        const envelope: VibeOnBackupEnvelope = parsed;
        const tracks: PortableTrack[] = [];
        const playlists: { name: string; songs: PortableTrack[] }[] = [];

        // Extract favorites
        if (envelope.library.favorites && Array.isArray(envelope.library.favorites)) {
            envelope.library.favorites.forEach((song) => {
                tracks.push(songToPortableTrack(song));
            });
        }

        // Extract playlists
        if (envelope.library.playlists && Array.isArray(envelope.library.playlists)) {
            envelope.library.playlists.forEach((p) => {
                const playlistSongs = (p.songs || []).map((song) => songToPortableTrack(song, p.name));
                playlists.push({
                    name: p.name,
                    songs: playlistSongs,
                });
            });
        }

        return {
            envelope,
            tracks,
            playlists,
            isVibeOnFormat: true,
            errors: [],
        };
    }

    // Handle array of tracks / generic JSON export
    const genericTracks: PortableTrack[] = [];
    if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
            if (item && typeof item === 'object') {
                genericTracks.push(songToPortableTrack(item));
            }
        });
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tracks)) {
        parsed.tracks.forEach((item: any) => {
            if (item && typeof item === 'object') {
                genericTracks.push(songToPortableTrack(item));
            }
        });
    } else {
        errors.push('Unrecognized JSON structure. Expected Vibe On backup format or track list array.');
    }

    return {
        tracks: genericTracks,
        playlists: [],
        isVibeOnFormat: false,
        errors,
    };
}

/**
 * Normalizes a Song object or raw track item into a PortableTrack.
 */
export function songToPortableTrack(song: any, playlistName?: string): PortableTrack {
    const title = song.name || song.title || song.trackName || song.song || 'Unknown Title';
    const artist =
        typeof song.primaryArtists === 'string'
            ? song.primaryArtists
            : song.artist || song.artistName || song.artists || 'Unknown Artist';
    const album =
        typeof song.album === 'object' ? song.album?.name : song.album || song.albumName || undefined;

    return {
        id: song.id ? String(song.id) : undefined,
        title,
        artist,
        album,
        duration: song.duration,
        year: song.year,
        language: song.language,
        artworkUrl: typeof song.image === 'string' ? song.image : undefined,
        provider: song.provider || (song.id ? 'jiosaavn' : undefined),
        providerId: song.providerId || (song.id ? String(song.id) : undefined),
        sourceUrl: song.sourceUrl || song.downloadUrl,
        isrc: song.isrc,
        playlistName: playlistName || song.playlistName,
        playlistPosition: song.playlistPosition,
        matchedSong: isFullSong(song) ? song : undefined,
    };
}

function isFullSong(obj: any): obj is Song {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.id === 'string' &&
        (typeof obj.name === 'string' || typeof obj.title === 'string') &&
        (obj.downloadUrl !== undefined || obj.music !== undefined)
    );
}
