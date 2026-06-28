import { LRUCache } from 'lru-cache';

export interface CacheOptions {
    max?: number;
    ttl?: number;
}

export class CacheService {
    private cache: LRUCache<string, any>;

    constructor(options: CacheOptions = {}) {
        this.cache = new LRUCache({
            max: options.max || 500,
            ttl: options.ttl || 1000 * 60 * 10, // 10 minutes default
        });
    }

    async get<T>(key: string): Promise<T | undefined> {
        return this.cache.get(key) as T | undefined;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        this.cache.set(key, value, { ttl });
    }

    async has(key: string): Promise<boolean> {
        return this.cache.has(key);
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }

    /**
     * Wrap a function with caching
     */
    async wrap<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== undefined) return cached;

        const fresh = await fetcher();
        await this.set(key, fresh, ttl);
        return fresh;
    }
}

// Global singleton instance for the SDK
export const globalCache = new CacheService();
