import { supabase } from '../lib/supabase';
import { Song } from '../types/music';
import axios from 'axios';
import { url as DEFAULT_API_BASE_URL } from '../constants';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { getOfflineSong, saveSongOffline } from '../utils/db';

export const PRIMARY_API_BASE_URL = 'https://elitejiosaavn-api.vercel.app';
export const FALLBACK_API_BASE_URL = DEFAULT_API_BASE_URL || 'https://jiosaavn-api-cyan-theta.vercel.app';

export const CHECKPOINT_STORAGE_KEY = 'vibeon_repair_favorites_checkpoint';

const getStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
        return localStorage;
    }
    return null;
};

export interface RecoveryProgress {
    totalChecked: number;
    alreadyComplete: number;
    repaired: number;
    failed: number;
    unavailable: number;
    isDryRun?: boolean;
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
    isDryRun?: boolean;
    primaryApiUrl?: string;
    fallbackApiUrl?: string;
    resumeCheckpoint?: boolean;
    limit?: number;
    onProgress?: (progress: RecoveryProgress) => void;
    onSongRepaired?: (repairedSong: Song) => void;
}

export interface CheckpointState {
    processedIds: string[];
    repairedSongs: Song[];
    failedItems: { songId: string; reason: string; isRetryable: boolean }[];
    timestamp: number;
}

export function saveCheckpoint(checkpoint: CheckpointState): void {
    try {
        const storage = getStorage();
        if (storage) {
            storage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
        }
    } catch (e) {
        console.warn('Failed to save repair checkpoint to storage:', e);
    }
}

export function loadCheckpoint(): CheckpointState | null {
    try {
        const storage = getStorage();
        if (storage) {
            const data = storage.getItem(CHECKPOINT_STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        }
    } catch (e) {
        console.warn('Failed to load repair checkpoint from storage:', e);
    }
    return null;
}

export function clearCheckpoint(): void {
    try {
        const storage = getStorage();
        if (storage) {
            storage.removeItem(CHECKPOINT_STORAGE_KEY);
        }
    } catch (e) {
        console.warn('Failed to clear repair checkpoint from storage:', e);
    }
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
    return decodeHtmlEntities(str).toLowerCase().replace(/[^a-z0-9]/g, '');
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
 * Extracts artist string from API object with HTML entity decoding.
 */
export function extractArtists(apiData: any): string {
    if (!apiData) return '';
    if (typeof apiData.artists === 'object' && apiData.artists !== null) {
        if (Array.isArray(apiData.artists.primary) && apiData.artists.primary.length > 0) {
            return decodeHtmlEntities(apiData.artists.primary.map((a: any) => a.name).filter(Boolean).join(', '));
        }
        if (Array.isArray(apiData.artists.all) && apiData.artists.all.length > 0) {
            return decodeHtmlEntities(apiData.artists.all.map((a: any) => a.name).filter(Boolean).join(', '));
        }
    }
    if (typeof apiData.primaryArtists === 'string') {
        return decodeHtmlEntities(apiData.primaryArtists);
    }
    return '';
}

/**
 * Maps raw JioSaavn API response payload item to a standard Vibe On Song model with HTML entity decoding and field preservation.
 */
export function mapApiSongToSong(apiData: any, fallbackId: string, existingSong?: Partial<Song>): Song {
    const rawName = apiData.name || apiData.title || existingSong?.name || existingSong?.title || `Song ${fallbackId}`;
    const name = decodeHtmlEntities(rawName);

    const primaryArtists = extractArtists(apiData) || decodeHtmlEntities(existingSong?.primaryArtists || 'Unknown Artist');

    let album: any = existingSong?.album || '';
    if (apiData.album && typeof apiData.album === 'object') {
        album = {
            id: String(apiData.album.id || ''),
            name: decodeHtmlEntities(String(apiData.album.name || '')),
        };
    } else if (typeof apiData.album === 'string' && apiData.album.trim() !== '') {
        album = decodeHtmlEntities(apiData.album);
    }

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
        name,
        primaryArtists,
        duration,
        image,
        downloadUrl,
        album,
        year,
    };

    return newSong;
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
 * Fetches song details with automatic primary/fallback endpoint failover, retries, and backoff.
 */
export async function fetchSongDetailsWithRetry(
    songId: string,
    maxRetries = 3,
    signal?: AbortSignal,
    primaryApiUrl = PRIMARY_API_BASE_URL,
    fallbackApiUrl = FALLBACK_API_BASE_URL
): Promise<{ song?: Song; errorReason?: string; isNotFound?: boolean; isRetryable?: boolean }> {
    const endpoints = [primaryApiUrl, fallbackApiUrl].filter((url, idx, self) => url && self.indexOf(url) === idx);

    for (const baseUrl of endpoints) {
        let attempt = 0;
        const endpoint = `${baseUrl}/api/songs/${encodeURIComponent(songId)}`;

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

                if (response.data && response.data.success === false) {
                    const msg = response.data.message || 'Song not found';
                    if (msg.toLowerCase().includes('not found')) {
                        return { errorReason: msg, isNotFound: true, isRetryable: false };
                    }
                }

                break;
            } catch (err: any) {
                if (axios.isCancel(err) || signal?.aborted) {
                    return { errorReason: 'Operation cancelled', isRetryable: false };
                }

                const status = err.response?.status;
                if (status === 404) {
                    break;
                }

                const isRetryable = status === 429 || (status >= 500 && status < 600) || !status;
                attempt++;

                if (attempt > maxRetries || !isRetryable) {
                    break;
                }

                const backoffMs = Math.pow(2, attempt) * 400 + Math.random() * 200;
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
    }

    return { errorReason: 'Song not found across API endpoints', isNotFound: true, isRetryable: false };
}

/**
 * Fallback search by title and artist when direct ID lookup returns not found.
 */
export async function fetchSongByFallbackSearch(
    existingSong: Song,
    maxRetries = 2,
    signal?: AbortSignal,
    primaryApiUrl = PRIMARY_API_BASE_URL,
    fallbackApiUrl = FALLBACK_API_BASE_URL
): Promise<{ song?: Song; errorReason?: string; isNotFound?: boolean; isRetryable?: boolean }> {
    const title = existingSong.name || existingSong.title;
    const artist = existingSong.primaryArtists;

    if (!title || typeof title !== 'string' || title.trim() === '' || title.startsWith('Song ')) {
        return { errorReason: 'Insufficient metadata for confident fallback search', isNotFound: true, isRetryable: false };
    }

    const query = artist && artist !== 'Unknown Artist' ? `${title} ${artist}` : title;
    const endpoints = [primaryApiUrl, fallbackApiUrl].filter((url, idx, self) => url && self.indexOf(url) === idx);

    for (const baseUrl of endpoints) {
        const searchUrl = `${baseUrl}/api/search/songs?query=${encodeURIComponent(query.trim())}&limit=10`;
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

                break;
            } catch (err: any) {
                if (axios.isCancel(err) || signal?.aborted) {
                    return { errorReason: 'Operation cancelled', isRetryable: false };
                }

                const status = err.response?.status;
                const isRetryable = status === 429 || (status >= 500 && status < 600) || !status;
                attempt++;

                if (attempt > maxRetries || !isRetryable) {
                    break;
                }

                const backoffMs = Math.pow(2, attempt) * 400 + Math.random() * 200;
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
    }

    return { errorReason: 'Fallback search returned no verified matches', isNotFound: true, isRetryable: false };
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
    const {
        concurrency = 5,
        maxRetries = 3,
        signal,
        forceAll = false,
        isDryRun = false,
        primaryApiUrl = PRIMARY_API_BASE_URL,
        fallbackApiUrl = FALLBACK_API_BASE_URL,
        resumeCheckpoint = true,
        limit,
        onProgress,
        onSongRepaired,
    } = options;

    let incompleteSongs: Song[] = [];
    let alreadyCompleteCount = 0;

    for (const song of favorites) {
        if (!forceAll && !isSongIncomplete(song)) {
            alreadyCompleteCount++;
        } else {
            incompleteSongs.push(song);
        }
    }

    if (typeof limit === 'number' && limit > 0) {
        incompleteSongs = incompleteSongs.slice(0, limit);
    }

    // Load checkpoint state if resuming
    let checkpoint = resumeCheckpoint ? loadCheckpoint() : null;
    const processedSet = new Set<string>(checkpoint?.processedIds || []);

    const report: RecoveryReport = {
        totalChecked: favorites.length,
        alreadyComplete: alreadyCompleteCount,
        repaired: checkpoint?.repairedSongs?.length || 0,
        failed: 0,
        unavailable: 0,
        isDryRun,
        isCancelled: false,
        repairedSongs: checkpoint?.repairedSongs || [],
        failedItems: checkpoint?.failedItems || [],
    };

    // Recalculate failed / unavailable counts from checkpoint
    if (checkpoint?.failedItems) {
        for (const item of checkpoint.failedItems) {
            if (item.reason.includes('Unsupported item type') || item.reason.includes('Unavailable')) {
                report.unavailable++;
            } else {
                report.failed++;
            }
        }
    }

    // Filter out already processed items if checkpoint active
    if (processedSet.size > 0) {
        incompleteSongs = incompleteSongs.filter((s) => !processedSet.has(s.id));
    }

    if (onProgress) {
        onProgress({ ...report });
    }

    if (incompleteSongs.length === 0 || signal?.aborted) {
        if (signal?.aborted) report.isCancelled = true;
        return report;
    }

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
            const itemError = {
                songId: song.id,
                reason: unsupportedReason,
                isRetryable: false,
            };
            report.failedItems.push(itemError);
            processedSet.add(song.id);

            saveCheckpoint({
                processedIds: Array.from(processedSet),
                repairedSongs: report.repairedSongs,
                failedItems: report.failedItems,
                timestamp: Date.now(),
            });

            if (onProgress) onProgress({ ...report });
            return;
        }

        // Fetch direct lookup
        let result = await fetchSongDetailsWithRetry(song.id, maxRetries, signal, primaryApiUrl, fallbackApiUrl);

        // Fallback search if direct lookup returned not found
        if ((!result.song && result.isNotFound) || (result.song && isSongIncomplete(result.song))) {
            const fallbackResult = await fetchSongByFallbackSearch(song, maxRetries, signal, primaryApiUrl, fallbackApiUrl);
            if (fallbackResult.song) {
                result = fallbackResult;
            } else if (!result.song && fallbackResult.errorReason) {
                result.errorReason = `${result.errorReason || 'Lookup failed'} | ${fallbackResult.errorReason}`;
            }
        }

        if (signal?.aborted) {
            report.isCancelled = true;
            return;
        }

        if (result.song) {
            const mergedSong = mapApiSongToSong(result.song, song.id, song);

            if (!isDryRun && userId) {
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
                        processedSet.add(song.id);
                        saveCheckpoint({
                            processedIds: Array.from(processedSet),
                            repairedSongs: report.repairedSongs,
                            failedItems: report.failedItems,
                            timestamp: Date.now(),
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
                        processedSet.add(song.id);
                        saveCheckpoint({
                            processedIds: Array.from(processedSet),
                            repairedSongs: report.repairedSongs,
                            failedItems: report.failedItems,
                            timestamp: Date.now(),
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
                    processedSet.add(song.id);
                    saveCheckpoint({
                        processedIds: Array.from(processedSet),
                        repairedSongs: report.repairedSongs,
                        failedItems: report.failedItems,
                        timestamp: Date.now(),
                    });
                    if (onProgress) onProgress({ ...report });
                    return;
                }
            }

            // Sync with local offline storage if song was downloaded offline
            if (!isDryRun) {
                try {
                    const offlineSong = await getOfflineSong(song.id);
                    if (offlineSong) {
                        await saveSongOffline(mergedSong, offlineSong.audioBlob, offlineSong.imageBlob, offlineSong.quality);
                    }
                } catch (e) {
                    console.warn(`Failed to update offline IndexedDB metadata for song ${song.id}:`, e);
                }
            }

            report.repaired++;
            report.repairedSongs.push(mergedSong);
            processedSet.add(song.id);

            saveCheckpoint({
                processedIds: Array.from(processedSet),
                repairedSongs: report.repairedSongs,
                failedItems: report.failedItems,
                timestamp: Date.now(),
            });

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
            processedSet.add(song.id);
            saveCheckpoint({
                processedIds: Array.from(processedSet),
                repairedSongs: report.repairedSongs,
                failedItems: report.failedItems,
                timestamp: Date.now(),
            });
        } else {
            report.failed++;
            report.failedItems.push({
                songId: song.id,
                reason: result.errorReason || 'Fetch error',
                isRetryable: result.isRetryable ?? true,
            });
            processedSet.add(song.id);
            saveCheckpoint({
                processedIds: Array.from(processedSet),
                repairedSongs: report.repairedSongs,
                failedItems: report.failedItems,
                timestamp: Date.now(),
            });
        }

        if (onProgress) {
            onProgress({ ...report });
        }
    };

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
    } else {
        // Clear checkpoint if fully finished
        clearCheckpoint();
    }

    return report;
}
