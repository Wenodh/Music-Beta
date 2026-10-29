import { Song } from '../../types/music';
import {
    PortableTrack,
    ImportFileType,
    ImportPreviewResult,
    ImportOptions,
    ImportSummary,
} from './types';
import { parseJsonBackup } from './parsers/jsonParser';
import { parseCsv } from './parsers/csvParser';
import { parseTxt } from './parsers/txtParser';
import { parseM3u } from './parsers/m3uParser';
import { matchTrackAgainstCatalog, createUnresolvedSong } from './matching';
import { AppDispatch, RootState } from '../../store';
import { setFavorites, setPlaylists } from '../../features/library/librarySlice';
import { supabase } from '../supabase';

export function detectFileType(fileName: string, content: string): ImportFileType {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.json')) return 'json';
    if (lowerName.endsWith('.csv')) return 'csv';
    if (lowerName.endsWith('.m3u') || lowerName.endsWith('.m3u8')) return 'm3u';
    if (lowerName.endsWith('.txt')) return 'txt';

    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('#EXTM3U')) return 'm3u';
    if (trimmed.includes(',') && trimmed.includes('\n')) return 'csv';

    return 'txt';
}

/**
 * Prepares an import preview by parsing content and detecting matches against the current library.
 */
export function generateImportPreview(
    fileContent: string,
    fileName: string,
    currentFavorites: Song[],
    currentPlaylists: { id: string; name: string; songs: Song[] }[]
): ImportPreviewResult {
    const fileType = detectFileType(fileName, fileContent);
    const catalog = [...currentFavorites];
    currentPlaylists.forEach((p) => catalog.push(...p.songs));

    let parsedTracks: PortableTrack[] = [];
    let detectedPlaylists: string[] = [];
    let errors: string[] = [];

    if (fileType === 'json') {
        const res = parseJsonBackup(fileContent);
        parsedTracks = [...res.tracks];
        res.playlists.forEach((p) => {
            parsedTracks.push(...p.songs);
        });
        detectedPlaylists = res.playlists.map((p) => p.name);
        errors = res.errors;
    } else if (fileType === 'csv') {
        const res = parseCsv(fileContent);
        parsedTracks = res.tracks;
        detectedPlaylists = res.playlists.map((p) => p.name);
        errors = res.errors;
    } else if (fileType === 'm3u') {
        const res = parseM3u(fileContent, fileName);
        parsedTracks = res.tracks;
        if (res.playlistName) detectedPlaylists = [res.playlistName];
        errors = res.errors;
    } else {
        const res = parseTxt(fileContent);
        parsedTracks = res.tracks;
        errors = res.errors;
    }

    let matchedCount = 0;
    let unmatchedCount = 0;
    let ambiguousCount = 0;

    parsedTracks.forEach((track) => {
        const matched = matchTrackAgainstCatalog(track, catalog);
        if (matched) {
            track.matchedSong = matched;
            matchedCount++;
        } else {
            track.isUnresolved = true;
            unmatchedCount++;
        }
    });

    return {
        fileType,
        fileName,
        totalEntries: parsedTracks.length,
        parsedTracks,
        matchedCount,
        unmatchedCount,
        ambiguousCount,
        detectedPlaylists,
        suggestedFormat: fileType.toUpperCase(),
    };
}

/**
 * Executes the import job in bounded batches, writing to Redux state and cloud database.
 */
export async function executeImportJob(
    preview: ImportPreviewResult,
    options: ImportOptions,
    dispatch: AppDispatch,
    getState: () => RootState,
    onProgress?: (progress: number, currentSummary: ImportSummary) => void,
    shouldCancel?: () => boolean
): Promise<ImportSummary> {
    const state = getState();
    const user = state?.auth?.user || null;

    const summary: ImportSummary = {
        totalFound: preview.parsedTracks.length,
        matched: 0,
        newlyImported: 0,
        alreadyPresent: 0,
        ambiguous: 0,
        unmatched: 0,
        failedWrites: 0,
        skipped: 0,
        errors: [],
    };

    let effectiveMode = options.mode;
    if (effectiveMode === 'replace') {
        summary.errors.push(
            'Replace mode is disabled for data safety because atomic cloud transactions are unavailable. Fallback to Merge mode executed.'
        );
        effectiveMode = 'merge';
    }

    let existingFavorites = [...(state?.library?.favorites || [])];
    let existingPlaylists = [...(state?.library?.playlists || [])];

    const favMap = new Map<string, Song>();
    existingFavorites.forEach((s) => favMap.set(s.id, s));

    const playlistMap = new Map<string, { id: string; name: string; songs: Song[] }>();
    existingPlaylists.forEach((p) => playlistMap.set(p.name.toLowerCase(), p));

    const batchSize = 25;
    const totalTracks = preview.parsedTracks.length;

    for (let i = 0; i < totalTracks; i += batchSize) {
        if (shouldCancel && shouldCancel()) {
            summary.errors.push('Import job cancelled by user.');
            break;
        }

        const batch = preview.parsedTracks.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
            const index = i + j;
            const track = batch[j];

            // Use custom manual override match if available
            const songToImport: Song =
                options.customMatches?.[index] || track.matchedSong || createUnresolvedSong(track);

            if (track.matchedSong || options.customMatches?.[index]) {
                summary.matched++;
            } else {
                summary.unmatched++;
            }

            // Target playlist processing
            const targetPName = track.playlistName || options.targetPlaylistName;

            if (targetPName) {
                const key = targetPName.toLowerCase();
                let p = playlistMap.get(key);
                if (!p) {
                    p = { id: crypto.randomUUID(), name: targetPName, songs: [] };
                    playlistMap.set(key, p);
                }
                const alreadyInPlaylist = p.songs.some((s) => s.id === songToImport.id);
                if (!alreadyInPlaylist) {
                    p.songs.push(songToImport);
                    summary.newlyImported++;
                } else {
                    summary.alreadyPresent++;
                }
            } else {
                // Add to Favorites
                if (favMap.has(songToImport.id)) {
                    summary.alreadyPresent++;
                } else {
                    favMap.set(songToImport.id, songToImport);
                    summary.newlyImported++;
                }
            }
        }

        const progressPercent = Math.min(100, Math.round(((i + batch.length) / (totalTracks || 1)) * 100));
        if (onProgress) {
            onProgress(progressPercent, summary);
        }
    }

    const finalFavorites = Array.from(favMap.values());
    const finalPlaylists = Array.from(playlistMap.values());

    // Update Redux state
    dispatch(setFavorites(finalFavorites));
    dispatch(setPlaylists(finalPlaylists));

    // Update Supabase if authenticated
    if (user) {
        try {
            if (finalFavorites.length > 0) {
                const chunkSize = 50;
                for (let k = 0; k < finalFavorites.length; k += chunkSize) {
                    const chunk = finalFavorites.slice(k, k + chunkSize);
                    const favUpserts = chunk.map((s) => ({
                        user_id: user.id,
                        song_id: s.id,
                        song_data: s,
                    }));
                    const { error: favErr } = await supabase.from('favorites').upsert(favUpserts);
                    if (favErr) {
                        summary.failedWrites += chunk.length;
                        summary.errors.push(`Supabase favorites write error: ${favErr.message}`);
                    }
                }
            }

            if (finalPlaylists.length > 0) {
                const playlistUpserts = finalPlaylists.map((p) => ({
                    id: p.id,
                    user_id: user.id,
                    name: p.name,
                    songs_data: p.songs,
                }));
                const { error: plErr } = await supabase.from('playlists').upsert(playlistUpserts);
                if (plErr) {
                    summary.failedWrites += finalPlaylists.length;
                    summary.errors.push(`Supabase playlists write error: ${plErr.message}`);
                }
            }
        } catch (err: any) {
            summary.failedWrites++;
            summary.errors.push(`Supabase sync warning: ${err.message || 'Failed to update remote database'}`);
        }
    }

    return summary;
}
