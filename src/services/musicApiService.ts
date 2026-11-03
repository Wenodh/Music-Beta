import axios, { AxiosRequestConfig } from 'axios';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export const PRIMARY_API_BASE = 'https://elitejiosaavn-api.vercel.app';
export const SECONDARY_API_BASE = 'https://jiosaavn-api-cyan-theta.vercel.app';

interface CacheEntry<T> {
    key: string;
    data: T;
    timestamp: number;
}

interface MusicCacheDBSchema extends DBSchema {
    feed_cache: {
        key: string;
        value: CacheEntry<any>;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'vibeon_music_cache_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MusicCacheDBSchema>> | null = null;

const getCacheDB = () => {
    if (typeof window === 'undefined') return null;
    if (!dbPromise) {
        try {
            dbPromise = openDB<MusicCacheDBSchema>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('feed_cache')) {
                        const store = db.createObjectStore('feed_cache', { keyPath: 'key' });
                        store.createIndex('by-timestamp', 'timestamp');
                    }
                },
            });
        } catch {
            return null;
        }
    }
    return dbPromise;
};

export interface ApiResponse<T = any> {
    data: T;
    isCached: boolean;
    provider: string;
}

export class MusicApiService {
    // In-memory fast cache
    private memoryCache = new Map<string, CacheEntry<any>>();

    // Deduplication of identical in-flight network requests
    private inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

    // Circuit breaker state tracking
    private providerFailureCount: Record<string, number> = {
        primary: 0,
        secondary: 0,
    };
    private providerCooldownUntil: Record<string, number> = {
        primary: 0,
        secondary: 0,
    };

    private readonly COOLDOWN_MS = 60000; // 60s cooldown after 3 consecutive failures
    private readonly MAX_CONSECUTIVE_FAILURES = 3;
    private readonly DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes cache TTL

    constructor() {
        this.loadFromStorage();
    }

    private async loadFromStorage() {
        // Hydrate from localStorage fallback
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = localStorage.getItem('vibeon_music_cache');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    Object.entries(parsed).forEach(([key, val]) => {
                        this.memoryCache.set(key, val as CacheEntry<any>);
                    });
                }
            }
        } catch {
            // Ignore parse errors
        }

        // Hydrate from IndexedDB asynchronously
        try {
            const db = await getCacheDB();
            if (db) {
                const allEntries = await db.getAll('feed_cache');
                allEntries.forEach((entry) => {
                    if (entry && entry.key && entry.data) {
                        this.memoryCache.set(entry.key, entry);
                    }
                });
            }
        } catch {
            // IndexedDB read error ignored
        }
    }

    private async persistEntry<T>(key: string, data: T) {
        const entry: CacheEntry<T> = { key, data, timestamp: Date.now() };
        this.memoryCache.set(key, entry);

        // Save to IndexedDB
        try {
            const db = await getCacheDB();
            if (db) {
                await db.put('feed_cache', entry);
            }
        } catch {
            // Fallback to localStorage
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const obj: Record<string, any> = {};
                    const entries = Array.from(this.memoryCache.entries()).slice(-30);
                    entries.forEach(([k, v]) => {
                        obj[k] = v;
                    });
                    localStorage.setItem('vibeon_music_cache', JSON.stringify(obj));
                }
            } catch {
                // Ignore write errors
            }
        }
    }

    /**
     * Check if provider is currently in cooldown due to circuit breaker
     */
    private isProviderCoolingDown(providerName: string): boolean {
        const now = Date.now();
        return this.providerCooldownUntil[providerName] > now;
    }

    private recordProviderSuccess(providerName: string) {
        this.providerFailureCount[providerName] = 0;
        this.providerCooldownUntil[providerName] = 0;
    }

    private recordProviderFailure(providerName: string) {
        this.providerFailureCount[providerName] = (this.providerFailureCount[providerName] || 0) + 1;
        if (this.providerFailureCount[providerName] >= this.MAX_CONSECUTIVE_FAILURES) {
            this.providerCooldownUntil[providerName] = Date.now() + this.COOLDOWN_MS;
            console.warn(`[MusicApiService] Circuit breaker tripped for ${providerName}. Cooldown until ${new Date(this.providerCooldownUntil[providerName]).toLocaleTimeString()}`);
        }
    }

    /**
     * Strict validation: checks if payload is truly valid music data and not an error response
     */
    public isValidMusicPayload(payload: any): boolean {
        if (!payload || typeof payload !== 'object') return false;

        // Explicit error indicators from JioSaavn proxies
        if (payload.status === 'FAILED' || payload.status === 'ERROR') return false;
        if (typeof payload.message === 'string' && /rate limit|blocked|denied|failed/i.test(payload.message)) return false;

        // Check if data is present and has meaningful structure
        const target = payload.data !== undefined ? payload.data : payload;

        if (Array.isArray(target)) return target.length >= 0;
        if (target && typeof target === 'object') {
            if (Array.isArray(target.results)) return true;
            if (Array.isArray(target.songs)) return true;
            if (target.id !== undefined) return true;
            if (target.name !== undefined || target.title !== undefined) return true;
            // General non-empty object containing results
            return Object.keys(target).length > 0 && !('error' in target);
        }

        return false;
    }

    /**
     * Normalize varied payload formats into consistent standard
     */
    public normalizeResponse(payload: any): any {
        if (!this.isValidMusicPayload(payload)) return null;

        if (payload.data !== undefined) return payload;
        if (payload.results !== undefined) return { data: { results: payload.results } };
        if (Array.isArray(payload)) return { data: { results: payload } };
        return { data: payload };
    }

    /**
     * Primary resilient fetching method with provider cascading, circuit breaker,
     * signal-safe in-flight deduplication, and stale-while-revalidate fallback.
     */
    public async fetchWithFallback<T = any>(
        pathAndQuery: string,
        config: AxiosRequestConfig = {},
        cacheKey?: string
    ): Promise<ApiResponse<T>> {
        const key = cacheKey || pathAndQuery;
        const cached = this.memoryCache.get(key);

        // Check if caller signal is already aborted
        if (config.signal?.aborted) {
            const err = new Error('canceled');
            (err as any).name = 'CanceledError';
            throw err;
        }

        // If duplicate request is already in-flight, attach a listener to caller's signal
        if (this.inFlightRequests.has(key)) {
            const inFlight = this.inFlightRequests.get(key)!;
            if (!config.signal) return inFlight;

            return new Promise<ApiResponse<T>>((resolve, reject) => {
                const onAbort = () => {
                    const err = new Error('canceled');
                    (err as any).name = 'CanceledError';
                    reject(err);
                };
                config.signal!.addEventListener('abort', onAbort, { once: true });
                inFlight.then(
                    (res) => {
                        config.signal!.removeEventListener('abort', onAbort);
                        resolve(res);
                    },
                    (err) => {
                        config.signal!.removeEventListener('abort', onAbort);
                        reject(err);
                    }
                );
            });
        }

        const requestPromise = (async () => {
            const providers = [
                { name: 'primary', base: PRIMARY_API_BASE },
                { name: 'secondary', base: SECONDARY_API_BASE },
            ];

            // If both providers are in cooldown, reset cooldown so we don't lock out the user
            if (this.isProviderCoolingDown('primary') && this.isProviderCoolingDown('secondary')) {
                this.providerCooldownUntil.primary = 0;
                this.providerCooldownUntil.secondary = 0;
            } else if (this.isProviderCoolingDown('primary') && !this.isProviderCoolingDown('secondary')) {
                // Prioritize secondary if primary is cooling down
                providers.reverse();
            }

            let lastError: any = null;

            for (const provider of providers) {
                if (this.isProviderCoolingDown(provider.name)) {
                    continue;
                }

                const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
                const targetUrl = `${provider.base}${cleanPath}`;

                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        const response = await axios.get(targetUrl, {
                            timeout: config.timeout || 7000,
                        });

                        const normalized = this.normalizeResponse(response.data);
                        if (normalized) {
                            this.recordProviderSuccess(provider.name);
                            await this.persistEntry(key, normalized);
                            return { data: normalized as T, isCached: false, provider: provider.name };
                        } else {
                            throw new Error(`Malformed or error payload received from ${provider.name}`);
                        }
                    } catch (err: any) {
                        lastError = err;
                        if (attempt === 1) {
                            this.recordProviderFailure(provider.name);
                        } else {
                            await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
                        }
                    }
                }
            }

            // Both network providers failed: return cached data if available without throwing
            if (cached && cached.data) {
                console.warn(`[MusicApiService] Network providers unavailable for ${pathAndQuery}. Serving stale cached data.`);
                return { data: cached.data as T, isCached: true, provider: 'cache' };
            }

            throw lastError || new Error(`All music providers failed for ${pathAndQuery}`);
        })();

        this.inFlightRequests.set(key, requestPromise);

        try {
            // Bind caller's signal safely
            if (config.signal) {
                return await new Promise<ApiResponse<T>>((resolve, reject) => {
                    const onAbort = () => {
                        const err = new Error('canceled');
                        (err as any).name = 'CanceledError';
                        reject(err);
                    };
                    config.signal!.addEventListener('abort', onAbort, { once: true });
                    requestPromise.then(
                        (res) => {
                            config.signal!.removeEventListener('abort', onAbort);
                            resolve(res);
                        },
                        (err) => {
                            config.signal!.removeEventListener('abort', onAbort);
                            reject(err);
                        }
                    );
                });
            }

            return await requestPromise;
        } finally {
            this.inFlightRequests.delete(key);
        }
    }

    /**
     * Synchronously access cached data if available
     */
    public getCachedData<T = any>(cacheKey: string): T | null {
        const cached = this.memoryCache.get(cacheKey);
        return cached ? (cached.data as T) : null;
    }

    /**
     * Clear all memory and persistent caches (for testing and manual reset)
     */
    public async clearCache(): Promise<void> {
        this.memoryCache.clear();
        this.inFlightRequests.clear();
        this.providerFailureCount = { primary: 0, secondary: 0 };
        this.providerCooldownUntil = { primary: 0, secondary: 0 };
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('vibeon_music_cache');
            }
            const db = await getCacheDB();
            if (db) {
                await db.clear('feed_cache');
            }
        } catch {
            // Ignore clear errors
        }
    }
}

export const musicApiService = new MusicApiService();
