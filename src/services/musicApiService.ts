import axios, { AxiosRequestConfig } from 'axios';

export const PRIMARY_API_BASE = 'https://elitejiosaavn-api.vercel.app';
export const SECONDARY_API_BASE = 'https://jiosaavn-api-cyan-theta.vercel.app';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class MusicApiService {
    private cache = new Map<string, CacheEntry<any>>();

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = localStorage.getItem('vibeon_music_cache');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    Object.entries(parsed).forEach(([key, val]) => {
                        this.cache.set(key, val as CacheEntry<any>);
                    });
                }
            }
        } catch {
            // Ignore storage parse errors
        }
    }

    private saveToStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const obj: Record<string, any> = {};
                const entries = Array.from(this.cache.entries()).slice(-30);
                entries.forEach(([key, val]) => {
                    obj[key] = val;
                });
                localStorage.setItem('vibeon_music_cache', JSON.stringify(obj));
            }
        } catch {
            // Ignore storage write errors
        }
    }

    public async fetchWithFallback<T = any>(
        pathAndQuery: string,
        config: AxiosRequestConfig = {},
        cacheKey?: string
    ): Promise<{ data: T; isCached: boolean; provider: string }> {
        const key = cacheKey || pathAndQuery;
        const cached = this.cache.get(key);

        const providers = [
            { name: 'primary', base: PRIMARY_API_BASE },
            { name: 'secondary', base: SECONDARY_API_BASE },
        ];

        let lastError: any = null;

        for (const provider of providers) {
            const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
            const targetUrl = `${provider.base}${cleanPath}`;

            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const response = await axios.get(targetUrl, {
                        ...config,
                        timeout: config.timeout || 7000,
                    });

                    if (response.data && (response.data.data || response.data.results || response.data.status === 'SUCCESS' || Array.isArray(response.data))) {
                        const payload = response.data;
                        this.cache.set(key, { data: payload, timestamp: Date.now() });
                        this.saveToStorage();
                        return { data: payload, isCached: false, provider: provider.name };
                    }
                } catch (err: any) {
                    lastError = err;
                    if (axios.isCancel(err)) {
                        throw err;
                    }
                    if (attempt < 1) {
                        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
                    }
                }
            }
        }

        if (cached && cached.data) {
            return { data: cached.data, isCached: true, provider: 'cache' };
        }

        throw lastError || new Error(`All music providers failed for ${pathAndQuery}`);
    }

    public getCachedData<T = any>(cacheKey: string): T | null {
        const cached = this.cache.get(cacheKey);
        return cached ? cached.data : null;
    }
}

export const musicApiService = new MusicApiService();
