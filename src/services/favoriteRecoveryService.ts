import { supabase } from '../lib/supabase';
import { Song } from '../types/music';
import axios from 'axios';
import { url as API_BASE_URL } from '../constants';

export interface RecoveryProgress {
    totalChecked: number;
    alreadyComplete: number;
    repaired: number;
    failed: number;
    unavailable: number;
    currentSongId?: string;
    currentSongName?: string;
    isCancelled: boolean;
}

export interface RecoveryReport extends RecoveryProgress {
    repairedSongs: Song[];
    failedItems: { songId: string; reason: string; isRetryable: boolean }[];
}

export interface RecoveryOptions {
    concurrency?: number;
    maxRetries?: number;
    signal?: AbortSignal;
    forceAll?: boolean;
    onProgress?: (progress: RecoveryProgress) => void;
    onSongRepaired?: (repairedSong: Song) => void;
}

/**
 * Checks whether a Song object is missing required metadata or has malformed playback/image URLs.
 */
export function isSongIncomplete(song: Partial<Song> | null | undefined): boolean {
    if (!song || typeof song !== 'object') return true;

    // Must have a valid ID
    if (!song.id || typeof song.id !== 'string' || song.id.trim() === '') return true;

    // Must have a title/name
    const name = song.name || song.title;
    if (!name || typeof name !== 'string' || name.trim() === '') return true;

    // Must have primaryArtists
    if (!song.primaryArtists || typeof song.primaryArtists !== 'string' || song.primaryArtists.trim() === '') return true;

    // Check image
    if (!hasValidMediaUrl(song.image)) return true;

    // Check downloadUrl / music
    if (!hasValidMediaUrl(song.downloadUrl) && !hasValidMediaUrl(song.music)) return true;

    return false;
}

function hasValidMediaUrl(urlData: any): boolean {
    if (!urlData) return false;
    if (typeof urlData === 'string' && urlData.trim() !== '') return true;
    if (Array.isArray(urlData) && urlData.length > 0) {
        return urlData.some((item: any) => item && typeof item.url === 'string' && item.url.trim() !== '');
    }
    return false;
}

/**
 * Normalizes string for title/artist matching.
 */
function normalizeString(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Validates candidate search result against expected title and artist before accepting a match.
 */
export function matchesCandidate(candidate: any, targetName?: string, targetArtist?: string): boolean {
    if (!candidate || typeof candidate !== 'object') return false;
    const candName = normalizeString(candidate.name || candidate.title || '');
    const targName = normalizeString(targetName || '');
    if (!candName || !targName) return false;

    const nameMatch = candName.includes(targName) || targName.includes(candName);
    if (!nameMatch) return false;

    if (targetArtist && targetArtist.trim() !== '') {
        const candArtist = normalizeString(extractArtists(candidate) || candidate.primaryArtists || '');
        const targArtist = normalizeString(targetArtist);
        if (candArtist && targArtist) {
            const artistMatch = candArtist.includes(targArtist) || targArtist.includes(candArtist);
            if (!artistMatch) return false;
        }
    }
    return true;
}

/**
 * Maps raw JioSaavn API response payload item to a standard Vibe On Song model.
 */
export function mapApiSongToSong(apiData: any, fallbackId: string, existingSong?: Partial<Song>): Song {
    const primaryArtists = extractArtists(apiData) || (typeof apiData.primaryArtists === 'string' ? apiData.primaryArtists : '');

    const album = apiData.album && typeof apiData.album === 'object'
        ? { id: String(apiData.album.id || ''), name: String(apiData.album.name || '') }
        : (existingSong?.album || '');

    const image = apiData.image && (Array.isArray(apiData.image) ? apiData.image.length > 0 : Boolean(apiData.image))
        ? apiData.image
        : (existingSong?.image || '');

    const downloadUrl = apiData.downloadUrl && (Array.isArray(apiData.downloadUrl) ? apiData.downloadUrl.length > 0 : Boolean(apiData.downloadUrl))
        ? apiData.downloadUrl
        : (existingSong?.downloadUrl || existingSong?.music || '');

    const duration = apiData.duration ?? existingSong?.duration ?? 0;
    const year = apiData.year ?? existingSong?.year;

    const newSong: Song = {
        ...existingSong,
        id: fallbackId, // Retain original favorite song_id
        name: apiData.name || existingSong?.name || existingSong?.title || `Song ${fallbackId}`,
        primaryArtists: primaryArtists || existingSong?.primaryArtists || 'Unknown Artist',
        duration,
        image,
        downloadUrl,
        album,
        year,
    };

    return newSong;
}

export function extractArtists(apiData: any): string {
    if (!apiData) return '';
    if (typeof apiData.artists === 'object' && apiData.artists !== null) {
        if (Array.isArray(apiData.artists.primary) && apiData.artists.primary.length > 0) {
            return apiData.artists.primary.map((a: any) => a.name).filter(Boolean).join(', ');
        }
        if (Array.isArray(apiData.artists.all) && apiData.artists.all.length > 0) {
            return apiData.artists.all.map((a: any) => a.name).filter(Boolean).join(', ');
        }
    }
    if (typeof apiData.primaryArtists === 'string') return apiData.primaryArtists;
    return '';
}

/**
 * Detects if an item is non-music or from an unsupported provider/type.
 */
export function getUnsupportedReason(song: Song): string | null {
    if (!song || !song.id) return 'Invalid item';
    const id = String(song.id);
    const type = String(song.type || '').toLowerCase();

    if (id.startsWith('radio:') || type === 'radio' || type === 'station') {
        return 'Unsupported item type: Radio Station';
    }
    if (id.startsWith('podcast:') || id.startsWith('podcast_') || type === 'podcast' || type === 'episode') {
        return 'Unsupported item type: Podcast Episode';
    }
    if (id.startsWith('librivox:') || id.startsWith('audiobook:') || type === 'audiobook') {
        return 'Unsupported item type: Audiobook';
    }
    if (type === 'album' || type === 'playlist' || type === 'artist') {
        return `Unsupported item type: ${song.type}`;
    }
    return null;
}

/**
 * Fetches song details from the JioSaavn API with retry, timeout, and backoff support.
 */
export async function fetchSongDetailsWithRetry(
    songId: string,
    maxRetries = 3,
    signal?: AbortSignal
): Promise<{ song?: Song; errorReason?: string; isNotFound?: boolean; isRetryable?: boolean }> {
    let attempt = 0;
    const endpoint = `${API_BASE_URL}/api/songs/${encodeURIComponent(songId)}`;

    while (attempt <= maxRetries) {
        if (signal?.aborted) {
            return { errorReason: 'Operation cancelled', isRetryable: false };
        }

        try {
            const response = await axios.get(endpoint, {
                signal,
                timeout: 10000,
            });

            if (response.data && response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
                const apiItem = response.data.data[0];
                if (apiItem) {
                    const mappedSong = mapApiSongToSong(apiItem, songId);
                    return { song: mappedSong };
                }
            }

            // If success is false or data is empty
            if (response.data && response.data.success === false) {
                const msg = response.data.message || 'Song not found';
                if (msg.toLowerCase().includes('not found')) {
                    return { errorReason: msg, isNotFound: true, isRetryable: false };
                }
            }

            return { errorReason: 'Song not found or empty response', isNotFound: true, isRetryable: false };
        } catch (err: any) {
            if (axios.isCancel(err) || signal?.aborted) {
                return { errorReason: 'Operation cancelled', isRetryable: false };
            }

            const status = err.response?.status;
            if (status === 404) {
                return { errorReason: 'Song not found (404)', isNotFound: true, isRetryable: false };
            }

            // Retryable errors: 429 (rate limit), 5xx (server error), network/timeout errors
            const isRetryable = status === 429 || (status >= 500 && status < 600) || !status;
            attempt++;

            if (attempt > maxRetries || !isRetryable) {
                return {
                    errorReason: err.message || `HTTP ${status || 'Network Error'}`,
                    isNotFound: false,
                    isRetryable,
                };
            }

            // Exponential backoff with jitter
            const backoffMs = Math.pow(2, attempt) * 500 + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
    }

    return { errorReason: 'Max retries exceeded', isRetryable: true };
}

/**
 * Fallback search by title and artist when direct ID lookup returns not found.
 */
export async function fetchSongByFallbackSearch(
    existingSong: Song,
    maxRetries = 2,
    signal?: AbortSignal
): Promise<{ song?: Song; errorReason?: string; isNotFound?: boolean; isRetryable?: boolean }> {
    const title = existingSong.name || existingSong.title;
    const artist = existingSong.primaryArtists;

    if (!title || typeof title !== 'string' || title.trim() === '') {
        return { errorReason: 'Missing title and artist for fallback search', isNotFound: true, isRetryable: false };
    }

    const query = artist ? `${title} ${artist}` : title;
    const searchUrl = `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(query.trim())}&limit=10`;

    let attempt = 0;
    while (attempt <= maxRetries) {
        if (signal?.aborted) {
            return { errorReason: 'Operation cancelled', isRetryable: false };
        }

        try {
            const response = await axios.get(searchUrl, {
                signal,
                timeout: 10000,
            });

            const results = response.data?.data?.results || response.data?.results || response.data?.data;
            if (Array.isArray(results) && results.length > 0) {
                for (const candidate of results) {
                    if (matchesCandidate(candidate, title, artist)) {
                        const mapped = mapApiSongToSong(candidate, existingSong.id, existingSong);
                        if (!isSongIncomplete(mapped)) {
                            return { song: mapped };
                        }
                    }
                }
            }

            return { errorReason: 'Fallback search returned no verified matches', isNotFound: true, isRetryable: false };
        } catch (err: any) {
            if (axios.isCancel(err) || signal?.aborted) {
                return { errorReason: 'Operation cancelled', isRetryable: false };
            }

            const status = err.response?.status;
            const isRetryable = status === 429 || (status >= 500 && status < 600) || !status;
            attempt++;

            if (attempt > maxRetries || !isRetryable) {
                return {
                    errorReason: err.message || `Fallback search HTTP ${status || 'Network Error'}`,
                    isNotFound: false,
                    isRetryable,
                };
            }

            const backoffMs = Math.pow(2, attempt) * 500 + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
    }

    return { errorReason: 'Fallback search max retries exceeded', isRetryable: true };
}

/**
 * Main recovery coordinator function.
 * Scans provided favorite songs list, fetches missing metadata, updates Supabase & Redux state.
 */
export async function repairFavorites(
    favorites: Song[],
    userId?: string,
    options: RecoveryOptions = {}
): Promise<RecoveryReport> {
    const { concurrency = 5, maxRetries = 3, signal, onProgress, onSongRepaired } = options;

    const report: RecoveryReport = {
        totalChecked: favorites.length,
        alreadyComplete: 0,
        repaired: 0,
        failed: 0,
        unavailable: 0,
        isCancelled: false,
        repairedSongs: [],
        failedItems: [],
    };

    const incompleteSongs: Song[] = [];

    // 1. Identify complete vs incomplete (or force all if forceAll option is true)
    const forceAll = options.forceAll ?? false;

    for (const song of favorites) {
        if (!forceAll && !isSongIncomplete(song)) {
            report.alreadyComplete++;
        } else {
            incompleteSongs.push(song);
        }
    }

    if (onProgress) {
        onProgress({ ...report });
    }

    if (incompleteSongs.length === 0 || signal?.aborted) {
        if (signal?.aborted) report.isCancelled = true;
        return report;
    }

    // Process in concurrency chunks
    let currentIndex = 0;

    const processNext = async (song: Song): Promise<void> => {
        if (signal?.aborted) {
            report.isCancelled = true;
            return;
        }

        report.currentSongId = song.id;
        report.currentSongName = song.name || song.title || song.id;

        // Check for non-music or unsupported item types first
        const unsupportedReason = getUnsupportedReason(song);
        if (unsupportedReason) {
            report.unavailable++;
            report.failedItems.push({
                songId: song.id,
                reason: unsupportedReason,
                isRetryable: false,
            });
            if (onProgress) onProgress({ ...report });
            return;
        }

        // Try direct lookup first
        let result = await fetchSongDetailsWithRetry(song.id, maxRetries, signal);

        // If direct lookup returned not found, attempt fallback search by title/artist
        if ((!result.song && result.isNotFound) || (result.song && isSongIncomplete(result.song))) {
            const fallbackResult = await fetchSongByFallbackSearch(song, maxRetries, signal);
            if (fallbackResult.song) {
                result = fallbackResult;
            } else if (!result.song) {
                // If direct lookup had non-retryable reason and fallback also failed, preserve failure reason
                if (fallbackResult.errorReason) {
                    result.errorReason = `${result.errorReason || 'Lookup failed'} | ${fallbackResult.errorReason}`;
                }
            }
        }

        if (signal?.aborted) {
            report.isCancelled = true;
            return;
        }

        if (result.song) {
            // Merge with existing song to preserve local attributes
            const mergedSong = mapApiSongToSong(result.song, song.id, song);

            // Update Supabase if user ID is present and Supabase client is available
            if (userId) {
                try {
                    const { data, error } = await supabase
                        .from('favorites')
                        .update({ song_data: mergedSong })
                        .eq('user_id', userId)
                        .eq('song_id', song.id)
                        .select();

                    if (error) {
                        console.error(`Failed to persist repaired song ${song.id} to Supabase:`, error);
                        report.failed++;
                        report.failedItems.push({
                            songId: song.id,
                            reason: `Database error: ${error.message}`,
                            isRetryable: true,
                        });
                        if (onProgress) onProgress({ ...report });
                        return;
                    }

                    if (!data || data.length === 0) {
                        console.warn(`Zero rows updated for song ${song.id} in Supabase favorites`);
                        report.failed++;
                        report.failedItems.push({
                            songId: song.id,
                            reason: 'Database update matched 0 rows (item missing or permission denied)',
                            isRetryable: false,
                        });
                        if (onProgress) onProgress({ ...report });
                        return;
                    }
                } catch (dbErr: any) {
                    console.error(`Database operation exception for song ${song.id}:`, dbErr);
                    report.failed++;
                    report.failedItems.push({
                        songId: song.id,
                        reason: `Database error: ${dbErr.message || 'Unknown error'}`,
                        isRetryable: true,
                    });
                    if (onProgress) onProgress({ ...report });
                    return;
                }
            }

            report.repaired++;
            report.repairedSongs.push(mergedSong);
            if (onSongRepaired) {
                onSongRepaired(mergedSong);
            }
        } else if (result.isNotFound) {
            report.unavailable++;
            report.failedItems.push({
                songId: song.id,
                reason: result.errorReason || 'Unavailable on provider',
                isRetryable: false,
            });
        } else {
            report.failed++;
            report.failedItems.push({
                songId: song.id,
                reason: result.errorReason || 'Fetch error',
                isRetryable: result.isRetryable ?? true,
            });
        }

        if (onProgress) {
            onProgress({ ...report });
        }
    };

    // Worker pool execution for bounded concurrency
    const workers: Promise<void>[] = [];

    const worker = async () => {
        while (currentIndex < incompleteSongs.length && !signal?.aborted) {
            const songToProcess = incompleteSongs[currentIndex++];
            await processNext(songToProcess);
        }
    };

    const workerCount = Math.min(concurrency, incompleteSongs.length);
    for (let i = 0; i < workerCount; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);

    if (signal?.aborted) {
        report.isCancelled = true;
    }

    return report;
}
