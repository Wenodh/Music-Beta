import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    CACHE_CATEGORIES,
    HOME_SECTIONS,
    getConfiguredCacheTtl,
    getHomePreferences,
    saveHomePreferences,
} from './homePreferences';

const createStorage = () => {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
    };
};

describe('home preferences', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('provides stable defaults for all Home sections and cache categories', () => {
        vi.stubGlobal('localStorage', createStorage());
        const preferences = getHomePreferences();

        expect(preferences.order).toEqual(HOME_SECTIONS.map(section => section.id));
        expect(preferences.visible.dailyMix).toBe(true);
        expect(preferences.visible.meditation).toBe(false);
        expect(Object.keys(preferences.cacheHours)).toHaveLength(CACHE_CATEGORIES.length);
    });

    it('persists visibility, order and cache duration changes', () => {
        const storage = createStorage();
        vi.stubGlobal('localStorage', storage);

        saveHomePreferences({
            visible: { ...getHomePreferences().visible, meditation: true },
            order: [...getHomePreferences().order].reverse(),
            cacheHours: { ...getHomePreferences().cacheHours, artist: 120 },
            cachePreset: 'custom',
        });

        const restored = getHomePreferences();
        expect(restored.visible.meditation).toBe(true);
        expect(restored.order[0]).toBe('arcade');
        expect(restored.cacheHours.artist).toBe(120);
        expect(restored.cachePreset).toBe('custom');
    });

    it('clamps invalid cache durations to supported bounds', () => {
        vi.stubGlobal('localStorage', createStorage());
        const current = getHomePreferences();
        saveHomePreferences({ cacheHours: { ...current.cacheHours, artist: 9999, search: 0 } });

        const restored = getHomePreferences();
        expect(restored.cacheHours.artist).toBe(168);
        expect(restored.cacheHours.search).toBe(CACHE_CATEGORIES.find(item => item.id === 'search')?.minHours);
    });

    it('normalizes duplicate section IDs and malformed persisted values', () => {
        const storage = createStorage();
        storage.setItem('vibeon_home_preferences_v1', JSON.stringify({
            order: ['arcade', 'arcade', 'unknown'],
            visible: { meditation: 'false', workout: true },
            cachePreset: 'unexpected',
        }));
        vi.stubGlobal('localStorage', storage);

        const preferences = getHomePreferences();
        expect(preferences.order.filter(id => id === 'arcade')).toHaveLength(1);
        expect(preferences.visible.meditation).toBe(false);
        expect(preferences.visible.workout).toBe(true);
        expect(preferences.cachePreset).toBe('balanced');
    });

    it('selects a TTL from the endpoint category and decodes query strings', () => {
        vi.stubGlobal('localStorage', createStorage());
        expect(getConfiguredCacheTtl('/api/search/songs?query=Telugu%20Top%20Hits')).toBe(6 * 60 * 60 * 1000);
        expect(getConfiguredCacheTtl('/api/search/artists?query=Sid%20Sriram')).toBe(72 * 60 * 60 * 1000);
        expect(getConfiguredCacheTtl('/api/search/songs?query=Telugu%20New%20Songs')).toBe(3 * 60 * 60 * 1000);
        expect(getConfiguredCacheTtl('/api/search?q=some%20query')).toBe(15 * 60 * 1000);
    });
});
