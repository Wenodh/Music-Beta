import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ArcadeGameId, ArcadeMetricType, ArcadeSettings, GameScoreRecord } from '../types';

export interface PendingSyncScore {
    id: string; // client-generated UUID
    gameId: ArcadeGameId;
    metricType: ArcadeMetricType;
    score: number;
    displayValue: string;
    difficulty?: string;
    mode?: 'daily' | 'practice';
    dailySeed?: string;
    playedAt: number;
}

interface ArcadeDBSchema extends DBSchema {
    scores: {
        key: string; // `${gameId}` or `${gameId}:${difficulty}` or `${gameId}:daily:${seed}`
        value: GameScoreRecord;
    };
    settings: {
        key: string;
        value: any;
    };
    leaderboard_cache: {
        key: string; // `${gameId}:${timeFilter}`
        value: {
            items: any[];
            cachedAt: number;
        };
    };
    pending_sync: {
        key: string; // UUID
        value: PendingSyncScore;
    };
}

const DB_NAME = 'vibeon_arcade';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ArcadeDBSchema>> | null = null;

export const getArcadeDB = (): Promise<IDBPDatabase<ArcadeDBSchema>> => {
    if (!dbPromise) {
        dbPromise = openDB<ArcadeDBSchema>(DB_NAME, 3, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (oldVersion < 1) {
                    if (!db.objectStoreNames.contains('scores')) {
                        db.createObjectStore('scores');
                    }
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings');
                    }
                }
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains('leaderboard_cache')) {
                        db.createObjectStore('leaderboard_cache');
                    }
                    if (!db.objectStoreNames.contains('pending_sync')) {
                        db.createObjectStore('pending_sync', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 3) {
                    // Recreate scores store without in-line keyPath to allow custom compound keys
                    if (db.objectStoreNames.contains('scores')) {
                        const existingStore = transaction.objectStore('scores');
                        if (existingStore.keyPath !== null) {
                            db.deleteObjectStore('scores');
                            db.createObjectStore('scores');
                        }
                    } else {
                        db.createObjectStore('scores');
                    }
                }
            },
        });
    }
    return dbPromise;
};

export const getScoreKey = (
    gameId: ArcadeGameId,
    difficulty?: string,
    mode?: 'daily' | 'practice',
    dailySeed?: string
): string => {
    if (mode === 'daily' && dailySeed) {
        return `${gameId}:daily:${dailySeed}`;
    }
    if (difficulty && difficulty !== 'normal') {
        return `${gameId}:${difficulty}`;
    }
    return gameId;
};

export const getHighScore = async (
    gameId: ArcadeGameId,
    difficulty?: string,
    mode?: 'daily' | 'practice',
    dailySeed?: string
): Promise<number> => {
    try {
        const db = await getArcadeDB();
        const key = getScoreKey(gameId, difficulty, mode, dailySeed);
        const record = await db.get('scores', key as any);
        if (record) {
            return record.bestScore ?? (record as any).highScore ?? 0;
        }
        return 0;
    } catch {
        return 0;
    }
};

export const getGameScoreRecord = async (
    gameId: ArcadeGameId,
    difficulty?: string,
    mode?: 'daily' | 'practice',
    dailySeed?: string
): Promise<GameScoreRecord | null> => {
    try {
        const db = await getArcadeDB();
        const key = getScoreKey(gameId, difficulty, mode, dailySeed);
        const record = await db.get('scores', key as any);
        if (!record) return null;
        return {
            gameId,
            metricType: record.metricType || 'points',
            bestScore: record.bestScore ?? (record as any).highScore ?? 0,
            lastScore: record.lastScore ?? 0,
            bestDisplayValue: record.bestDisplayValue || String(record.bestScore ?? (record as any).highScore ?? 0),
            lastDisplayValue: record.lastDisplayValue || String(record.lastScore ?? 0),
            playedAt: record.playedAt || Date.now(),
            difficulty,
            mode,
            dailySeed,
        };
    } catch {
        return null;
    }
};

export const saveGameScore = async (
    gameId: ArcadeGameId,
    score: number,
    metricType: ArcadeMetricType = 'points',
    displayValue?: string,
    difficulty: string = 'normal',
    mode: 'daily' | 'practice' = 'practice',
    dailySeed?: string
): Promise<{ isNewHighScore: boolean; bestScore: number; bestDisplayValue: string }> => {
    try {
        const db = await getArcadeDB();
        const key = getScoreKey(gameId, difficulty, mode, dailySeed);
        const existing = await db.get('scores', key as any);

        const currentBest = existing ? (existing.bestScore ?? (existing as any).highScore ?? 0) : null;
        const lowerIsBetter = metricType === 'time_ms' || metricType === 'moves';

        let isNewHighScore = false;
        if (currentBest === null) {
            isNewHighScore = true;
        } else if (lowerIsBetter) {
            isNewHighScore = score < currentBest;
        } else {
            isNewHighScore = score > currentBest;
        }

        const bestScore = isNewHighScore ? score : (currentBest ?? score);
        const formattedDisplay = displayValue || String(score);
        const bestDisplayValue = isNewHighScore ? formattedDisplay : (existing?.bestDisplayValue || formattedDisplay);

        const record: GameScoreRecord = {
            gameId,
            metricType,
            bestScore,
            lastScore: score,
            bestDisplayValue,
            lastDisplayValue: formattedDisplay,
            playedAt: Date.now(),
            difficulty,
            mode,
            dailySeed,
        };

        await db.put('scores', record, key as any);

        // Queue in pending_sync for guest reconciliation or background cloud sync
        const pendingId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync_${Date.now()}_${Math.random()}`;
        await db.put('pending_sync', {
            id: pendingId,
            gameId,
            metricType,
            score,
            displayValue: formattedDisplay,
            difficulty,
            mode,
            dailySeed,
            playedAt: Date.now(),
        });

        return { isNewHighScore, bestScore, bestDisplayValue };
    } catch (err) {
        console.warn('Failed to save score to IndexedDB', err);
        return {
            isNewHighScore: false,
            bestScore: score,
            bestDisplayValue: displayValue || String(score),
        };
    }
};

export const getAllScores = async (): Promise<Record<string, number>> => {
    try {
        const db = await getArcadeDB();
        const all = await db.getAll('scores');
        const map: Record<string, number> = {};
        all.forEach((item: any) => {
            const id = item.gameId;
            const scoreVal = item.bestScore ?? item.highScore ?? 0;
            // Map by gameId for backwards compatibility
            if (map[id] === undefined || scoreVal > map[id]) {
                map[id] = scoreVal;
            }
        });
        return map;
    } catch {
        return {};
    }
};

export const getPendingSyncScores = async (): Promise<PendingSyncScore[]> => {
    try {
        const db = await getArcadeDB();
        return await db.getAll('pending_sync');
    } catch {
        return [];
    }
};

export const removePendingSyncScore = async (id: string): Promise<void> => {
    try {
        const db = await getArcadeDB();
        await db.delete('pending_sync', id);
    } catch (e) {
        console.warn('Failed to remove pending sync score', e);
    }
};

const DEFAULT_SETTINGS: ArcadeSettings = {
    themeMode: 'auto',
    selectedThemeId: 'synthwave-beats',
    sfxEnabled: false,
    sfxVolume: 0.2,
    dialogueEnabled: true,
    dialogueLanguage: 'auto',
};

export const getArcadeSettings = async (): Promise<ArcadeSettings> => {
    try {
        const db = await getArcadeDB();
        const saved = await db.get('settings', 'config');
        return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const saveArcadeSettings = async (settings: ArcadeSettings): Promise<void> => {
    try {
        const db = await getArcadeDB();
        await db.put('settings', settings, 'config');
    } catch (e) {
        console.warn('Failed to save arcade settings', e);
    }
};
