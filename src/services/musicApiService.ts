import axios, { AxiosRequestConfig } from 'axios';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { getConfiguredCacheTtl } from '../features/home/homePreferences';

export const PRIMARY_API_BASE = 'https://elitejiosaavn-api.vercel.app';
export const SECONDARY_API_BASE = 'https://jiosaavn-api-cyan-theta.vercel.app';

interface CacheEntry<T> {
    key: string;
    data: T;
    timestamp: number;
    lastAccessedAt?: number;
}

interface InFlightEntry<T = any> {
    promise: Promise<ApiResponse<T>>;
    controller: AbortController;
    consumers: number;
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
const MAX_CACHE_ENTRIES = 200;
let dbPromise: Promise<IDBPDatabase<MusicCacheDBSchema>> | null = null;

const getCacheDB = () => {
    if (typeof window === 'undefined') return null;
    if (!dbPromise) {
        dbPromise = openDB<MusicCacheDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('feed_cache')) {
                    const store = db.createObjectStore('feed_cache', { keyPath: 'key' });
                    store.createIndex('by-timestamp', 'timestamp');
                }
            },
        }).catch((error) => {
            dbPromise = null;
            throw error;
        });
    }
    return dbPromise;
};

export interface ApiResponse<T = any> {
    data: T;
    isCached: boolean;
    provider: string;
}

const createCanceledError = () => {
    const error = new Error('canceled');
    error.name = 'CanceledError';
    return error;
};

const isCanceled = (error: any) =>
    axios.isCancel(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(createCanceledError());
    const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
    }, ms);
    const onAbort = () => {
        clearTimeout(timer);
        reject(createCanceledError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
});

export class MusicApiService {
    private memoryCache = new Map<string, CacheEntry<any>>();
    private inFlightRequests = new Map<string, InFlightEntry>();
    private providerFailureCount: Record<string, number> = { primary: 0, secondary: 0 };
    private providerCooldownUntil: Record<string, number> = { primary: 0, secondary: 0 };
    private storageReady: Promise<void>;
    private metrics = {
        logicalRequests: 0,
        httpAttempts: 0,
        cacheHits: 0,
        cacheMisses: 0,
        deduplicatedRequests: 0,
        retries: 0,
        providerFallbacks: 0,
        providerFailures: 0,
        staleFallbacks: 0,
        cancellations: 0,
    };

    private readonly COOLDOWN_MS = 60000;
    private readonly MAX_CONSECUTIVE_FAILURES = 3;

    constructor() {
        this.storageReady = this.loadFromStorage();
    }

    private async loadFromStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = localStorage.getItem('vibeon_music_cache');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    Object.entries(parsed).forEach(([key, val]) => {
                        if (val && typeof (val as CacheEntry<any>).timestamp === 'number') {
                            this.memoryCache.set(key, val as CacheEntry<any>);
                        }
                    });
                }
            }
        } catch { /* Storage is optional. */ }

        try {
            const db = await getCacheDB();
            if (!db) return;
            const entries = await db.getAll('feed_cache');
            entries.forEach((entry) => {
                if (entry?.key && entry.data !== undefined) {
                    const existing = this.memoryCache.get(entry.key);
                    if (!existing || entry.timestamp > existing.timestamp) this.memoryCache.set(entry.key, entry);
                }
            });
        } catch { /* IndexedDB may be unavailable in private browsing. */ }
    }

    private getTtl(key: string) {
        return getConfiguredCacheTtl(key);
    }

    private async persistEntry<T>(key: string, data: T) {
        const now = Date.now();
        const entry: CacheEntry<T> = { key, data, timestamp: now, lastAccessedAt: now };
        this.memoryCache.set(key, entry);

        // Keep memory/storage bounded; evict oldest entries first.
        if (this.memoryCache.size > MAX_CACHE_ENTRIES) {
            const oldest = [...this.memoryCache.values()]
                .sort((a, b) => (a.lastAccessedAt ?? a.timestamp) - (b.lastAccessedAt ?? b.timestamp))
                .slice(0, this.memoryCache.size - MAX_CACHE_ENTRIES);
            oldest.forEach((item) => this.memoryCache.delete(item.key));
        }

        try {
            const db = await getCacheDB();
            if (db) {
                await db.put('feed_cache', entry);
                const count = await db.count('feed_cache');
                if (count > MAX_CACHE_ENTRIES) {
                    const all = await db.getAll('feed_cache');
                    const oldest = all
                        .sort((a, b) => (a.lastAccessedAt ?? a.timestamp) - (b.lastAccessedAt ?? b.timestamp))
                        .slice(0, count - MAX_CACHE_ENTRIES);
                    const transaction = db.transaction('feed_cache', 'readwrite');
                    await Promise.all(oldest.map((item) => transaction.store.delete(item.key)));
                    await transaction.done;
                }
            }
        } catch {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const snapshot: Record<string, CacheEntry<any>> = {};
                    [...this.memoryCache.entries()].forEach(([cacheKey, value]) => { snapshot[cacheKey] = value; });
                    localStorage.setItem('vibeon_music_cache', JSON.stringify(snapshot));
                }
            } catch { /* Ignore quota/security errors. */ }
        }
    }

    private isProviderCoolingDown(name: string) {
        return this.providerCooldownUntil[name] > Date.now();
    }

    private recordProviderSuccess(name: string) {
        this.providerFailureCount[name] = 0;
        this.providerCooldownUntil[name] = 0;
    }

    private recordProviderFailure(name: string, error: any) {
        if (isCanceled(error)) return;
        // A normal 4xx indicates a request/client issue, not provider instability.
        const status = error?.response?.status;
        if (status && status < 500 && status !== 429) return;

        this.metrics.providerFailures += 1;
        this.providerFailureCount[name] = (this.providerFailureCount[name] || 0) + 1;
        if (this.providerFailureCount[name] >= this.MAX_CONSECUTIVE_FAILURES && !this.isProviderCoolingDown(name)) {
            this.providerCooldownUntil[name] = Date.now() + this.COOLDOWN_MS;
            console.warn(
                `[MusicApiService] Circuit breaker tripped for ${name} after ${this.providerFailureCount[name]} failed requests. Status=${status || 'network/timeout'}; cooldown=${this.COOLDOWN_MS}ms.`
            );
        }
    }

    public isValidMusicPayload(payload: any): boolean {
        if (!payload || typeof payload !== 'object') return false;
        if (payload.status === 'FAILED' || payload.status === 'ERROR') return false;
        if (typeof payload.message === 'string' && /rate limit|blocked|denied|failed/i.test(payload.message)) return false;
        const target = payload.data !== undefined ? payload.data : payload;
        if (Array.isArray(target)) return true;
        if (target && typeof target === 'object') {
            if (Array.isArray(target.results) || Array.isArray(target.songs)) return true;
            if (target.id !== undefined || target.name !== undefined || target.title !== undefined) return true;
            return Object.keys(target).length > 0 && !('error' in target);
        }
        return false;
    }

    public normalizeResponse(payload: any): any {
        if (!this.isValidMusicPayload(payload)) return null;
        if (payload.data !== undefined) return payload;
        if (payload.results !== undefined) return { data: { results: payload.results } };
        if (Array.isArray(payload)) return { data: { results: payload } };
        return { data: payload };
    }

    private async waitForShared<T>(entry: InFlightEntry<T>, signal?: AbortSignal): Promise<ApiResponse<T>> {
        if (signal?.aborted) throw createCanceledError();
        entry.consumers += 1;
        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            entry.consumers = Math.max(0, entry.consumers - 1);
            if (entry.consumers === 0 && entry.controller.signal.aborted === false) {
                // Cancel upstream work only when every waiting caller has left.
                entry.controller.abort();
            }
        };

        if (!signal) {
            try { return await entry.promise; }
            finally { release(); }
        }

        return new Promise<ApiResponse<T>>((resolve, reject) => {
            const onAbort = () => {
                this.metrics.cancellations += 1;
                release();
                reject(createCanceledError());
            };
            signal.addEventListener('abort', onAbort, { once: true });
            entry.promise.then(
                (result) => {
                    signal.removeEventListener('abort', onAbort);
                    if (signal.aborted) return onAbort();
                    release();
                    resolve(result);
                },
                (error) => {
                    signal.removeEventListener('abort', onAbort);
                    release();
                    reject(error);
                }
            );
        });
    }

    public async fetchWithFallback<T = any>(
        pathAndQuery: string,
        config: AxiosRequestConfig = {},
        cacheKey?: string
    ): Promise<ApiResponse<T>> {
        const key = cacheKey || pathAndQuery;
        const callerSignal = config.signal;
        this.metrics.logicalRequests += 1;
        await this.storageReady;
        const cached = this.memoryCache.get(key);

        if (callerSignal?.aborted) {
            this.metrics.cancellations += 1;
            throw createCanceledError();
        }

        if (cached && Date.now() - cached.timestamp < this.getTtl(key)) {
            this.metrics.cacheHits += 1;
            cached.lastAccessedAt = Date.now();
            this.memoryCache.set(key, cached);
            void getCacheDB()?.then(db => db.put('feed_cache', cached)).catch(() => undefined);
            return { data: cached.data as T, isCached: true, provider: 'cache' };
        }
        this.metrics.cacheMisses += 1;

        const existing = this.inFlightRequests.get(key);
        if (existing && !existing.controller.signal.aborted) {
            this.metrics.deduplicatedRequests += 1;
            return this.waitForShared<T>(existing, callerSignal);
        }
        // A canceled request can remain in the map until its promise settles.
        // Do not attach a new caller to an already-aborted request (notably in StrictMode).
        if (existing?.controller.signal.aborted) this.inFlightRequests.delete(key);

        const controller = new AbortController();
        const requestPromise = (async (): Promise<ApiResponse<T>> => {
            const primaryCooling = this.isProviderCoolingDown('primary');
            const secondaryCooling = this.isProviderCoolingDown('secondary');
            if (primaryCooling && secondaryCooling) {
                if (cached?.data) {
                    return { data: cached.data as T, isCached: true, provider: 'cache' };
                }
                const retryAt = Math.max(this.providerCooldownUntil.primary, this.providerCooldownUntil.secondary);
                throw new Error(`All music providers are temporarily unavailable. Retry after ${new Date(retryAt).toISOString()}.`);
            }

            const providers = [
                { name: 'primary', base: PRIMARY_API_BASE },
                { name: 'secondary', base: SECONDARY_API_BASE },
            ];
            if (primaryCooling && !secondaryCooling) providers.reverse();

            let lastError: any = null;
            const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;

            for (const provider of providers) {
                if (this.isProviderCoolingDown(provider.name)) continue;

                for (let attempt = 0; attempt < 2; attempt++) {
                    if (controller.signal.aborted) throw createCanceledError();
                    try {
                        this.metrics.httpAttempts += 1;
                        if (provider.name === 'secondary') this.metrics.providerFallbacks += 1;
                        const response = await axios.get(`${provider.base}${cleanPath}`, {
                            timeout: config.timeout || 7000,
                            headers: config.headers,
                            params: config.params,
                            signal: controller.signal,
                        });
                        const normalized = this.normalizeResponse(response.data);
                        if (!normalized) throw new Error(`Malformed payload from ${provider.name}`);
                        this.recordProviderSuccess(provider.name);
                        await this.persistEntry(key, normalized);
                        return { data: normalized as T, isCached: false, provider: provider.name };
                    } catch (error: any) {
                        if (isCanceled(error) || controller.signal.aborted) throw createCanceledError();
                        lastError = error;
                        const status = error?.response?.status;
                        const retryable = !status || status === 429 || status >= 500 || error?.code === 'ECONNABORTED';
                        if (attempt === 1 || !retryable) this.recordProviderFailure(provider.name, error);
                        if (attempt === 0 && retryable) {
                            this.metrics.retries += 1;
                            await wait(250, controller.signal);
                        }
                        else if (!retryable) break;
                    }
                }
            }

            if (cached?.data) {
                this.metrics.staleFallbacks += 1;
                console.warn(`[MusicApiService] Providers unavailable for ${pathAndQuery}; serving stale cache.`);
                return { data: cached.data as T, isCached: true, provider: 'cache' };
            }
            throw lastError || new Error(`All music providers failed for ${pathAndQuery}`);
        })();

        const entry: InFlightEntry<T> = { promise: requestPromise, controller, consumers: 0 };
        this.inFlightRequests.set(key, entry);
        // Ensure only this request removes its own map entry.
        requestPromise.finally(() => {
            if (this.inFlightRequests.get(key) === entry) this.inFlightRequests.delete(key);
        }).catch(() => undefined);

        return this.waitForShared<T>(entry, callerSignal);
    }

    public getCacheStats(): { entries: number; approximateBytes: number; metrics: typeof this.metrics } {
        let approximateBytes = 0;
        for (const [key, entry] of this.memoryCache.entries()) {
            try { approximateBytes += key.length * 2 + JSON.stringify(entry.data).length * 2; }
            catch { /* Ignore non-serializable cache payloads in this estimate. */ }
        }
        return { entries: this.memoryCache.size, approximateBytes, metrics: { ...this.metrics } };
    }

    public getCachedData<T = any>(cacheKey: string): T | null {
        const cached = this.memoryCache.get(cacheKey);
        return cached ? cached.data as T : null;
    }

    public async clearCache(): Promise<void> {
        await this.storageReady;
        this.memoryCache.clear();
        this.inFlightRequests.forEach((entry) => entry.controller.abort());
        this.inFlightRequests.clear();
        this.providerFailureCount = { primary: 0, secondary: 0 };
        this.providerCooldownUntil = { primary: 0, secondary: 0 };
        this.metrics = { logicalRequests: 0, httpAttempts: 0, cacheHits: 0, cacheMisses: 0, deduplicatedRequests: 0, retries: 0, providerFallbacks: 0, providerFailures: 0, staleFallbacks: 0, cancellations: 0 };
        try {
            if (typeof window !== 'undefined' && window.localStorage) localStorage.removeItem('vibeon_music_cache');
            const db = await getCacheDB();
            if (db) await db.clear('feed_cache');
        } catch { /* Ignore cache cleanup errors. */ }
    }
}

export const musicApiService = new MusicApiService();
