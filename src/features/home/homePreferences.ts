export const HOME_SECTIONS = [
    { id: 'dailyMix', label: 'Daily Mix', description: 'Personalized recommendations', defaultVisible: true },
    { id: 'recentlyPlayed', label: 'Recently Played Songs', description: 'Your listening history', defaultVisible: true },
    { id: 'recentlyPlayedAlbums', label: 'Recently Played Albums', description: 'Albums you recently played', defaultVisible: true },
    { id: 'latestSongs', label: 'Latest Songs', description: 'New releases', defaultVisible: true },
    { id: 'trendingSongs', label: 'Trending Songs', description: 'Popular tracks', defaultVisible: true },
    { id: 'trendingAlbums', label: 'Trending Albums', description: 'Popular albums', defaultVisible: true },
    { id: 'featuredArtists', label: 'Featured Artists', description: 'Artist discovery', defaultVisible: true },
    { id: 'topPlaylists', label: 'Top Playlists', description: 'Popular playlists', defaultVisible: true },
    { id: 'meditation', label: 'Meditation', description: 'Relax and focus', defaultVisible: false },
    { id: 'work', label: 'Work', description: 'Music for productivity', defaultVisible: false },
    { id: 'developerPicks', label: "Developer's Picks", description: 'Hand-picked music', defaultVisible: false },
    { id: 'chill', label: 'Chill', description: 'Relaxed listening', defaultVisible: false },
    { id: 'workout', label: 'Workout', description: 'Music for exercise', defaultVisible: false },
    { id: 'arcade', label: 'Vibe Arcade', description: 'Mini games promotion', defaultVisible: true },
] as const;

export type HomeSectionId = typeof HOME_SECTIONS[number]['id'];
export type CacheCategory = 'search' | 'trending' | 'latest' | 'artist' | 'album' | 'playlist' | 'recommendations' | 'catalog';

export const CACHE_CATEGORIES: { id: CacheCategory; label: string; defaultHours: number; minHours: number; maxHours: number }[] = [
    { id: 'search', label: 'Search results', defaultHours: 0.25, minHours: 0.0833, maxHours: 2 },
    { id: 'trending', label: 'Trending content', defaultHours: 6, minHours: 1, maxHours: 72 },
    { id: 'latest', label: 'Latest releases', defaultHours: 3, minHours: 1, maxHours: 24 },
    { id: 'artist', label: 'Artist details', defaultHours: 72, minHours: 12, maxHours: 168 },
    { id: 'album', label: 'Album details', defaultHours: 72, minHours: 12, maxHours: 168 },
    { id: 'playlist', label: 'Playlist details', defaultHours: 24, minHours: 6, maxHours: 168 },
    { id: 'recommendations', label: 'Recommendations / Daily Mix', defaultHours: 12, minHours: 1, maxHours: 72 },
    { id: 'catalog', label: 'Static catalog', defaultHours: 168, minHours: 24, maxHours: 720 },
];

export interface HomePreferences {
    visible: Record<HomeSectionId, boolean>;
    order: HomeSectionId[];
    cacheHours: Record<CacheCategory, number>;
    cachePreset: 'frequent' | 'balanced' | 'save' | 'custom';
}

const STORAGE_KEY = 'vibeon_home_preferences_v1';
const listeners = new Set<() => void>();
const defaults = (): HomePreferences => ({
    visible: Object.fromEntries(HOME_SECTIONS.map(section => [section.id, section.defaultVisible])) as Record<HomeSectionId, boolean>,
    order: HOME_SECTIONS.map(section => section.id),
    cacheHours: Object.fromEntries(CACHE_CATEGORIES.map(category => [category.id, category.defaultHours])) as Record<CacheCategory, number>,
    cachePreset: 'balanced',
});

const normalize = (value: Partial<HomePreferences> | null | undefined): HomePreferences => {
    const base = defaults();
    if (!value) return base;
    const validIds = new Set<string>(HOME_SECTIONS.map(section => section.id));
    const order = Array.isArray(value.order) ? value.order.filter((id): id is HomeSectionId => validIds.has(id)) : base.order;
    HOME_SECTIONS.forEach(section => { if (!order.includes(section.id)) order.push(section.id); });
    const visible = { ...base.visible, ...(value.visible || {}) };
    const cacheHours = { ...base.cacheHours };
    CACHE_CATEGORIES.forEach(category => {
        const candidate = Number(value.cacheHours?.[category.id]);
        if (Number.isFinite(candidate)) cacheHours[category.id] = Math.min(category.maxHours, Math.max(category.minHours, candidate));
    });
    return { visible, order, cacheHours, cachePreset: value.cachePreset || 'balanced' };
};

export const getHomePreferences = (): HomePreferences => {
    if (typeof localStorage === 'undefined') return defaults();
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
    catch { return defaults(); }
};

export const saveHomePreferences = (updates: Partial<HomePreferences>): HomePreferences => {
    const next = normalize({ ...getHomePreferences(), ...updates });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
    listeners.forEach(listener => listener());
    return next;
};

export const subscribeHomePreferences = (listener: () => void) => {
    listeners.add(listener);
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', listener);
        return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
    }
    return () => listeners.delete(listener);
};

export const getConfiguredCacheTtl = (key: string): number => {
    let path = key.toLowerCase();
    try { path = decodeURIComponent(path); } catch { /* Keep the encoded cache key if malformed. */ }
    let category: CacheCategory = 'catalog';
    if (/search/.test(path)) category = 'search';
    else if (/recommend|radio|daily.?mix/.test(path)) category = 'recommendations';
    else if (/artist/.test(path)) category = 'artist';
    else if (/album/.test(path)) category = 'album';
    else if (/playlist/.test(path)) category = 'playlist';
    else if (/latest|new.?songs|new.?releases/.test(path)) category = 'latest';
    else if (/trending|top.?hits|modules/.test(path)) category = 'trending';
    return getHomePreferences().cacheHours[category] * 60 * 60 * 1000;
};
