import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ArcadeGameId, ArcadeSettings, GameScoreRecord } from '../types';

interface ArcadeDBSchema extends DBSchema {
    scores: {
        key: ArcadeGameId;
        value: GameScoreRecord;
    };
    settings: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'vibeon_arcade';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ArcadeDBSchema>> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ArcadeDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('scores')) {
                    db.createObjectStore('scores', { keyPath: 'gameId' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            },
        });
    }
    return dbPromise;
};

export const getHighScore = async (gameId: ArcadeGameId): Promise<number> => {
    try {
        const db = await getDB();
        const record = await db.get('scores', gameId);
        return record?.highScore || 0;
    } catch {
        return 0;
    }
};

export const saveGameScore = async (
    gameId: ArcadeGameId,
    score: number
): Promise<{ isNewHighScore: boolean; highScore: number }> => {
    try {
        const db = await getDB();
        const existing = await db.get('scores', gameId);
        const currentHigh = existing?.highScore || 0;
        const isNewHighScore = score > currentHigh;
        const newHighScore = Math.max(score, currentHigh);

        await db.put('scores', {
            gameId,
            highScore: newHighScore,
            lastScore: score,
            playedAt: Date.now(),
        });

        return { isNewHighScore, highScore: newHighScore };
    } catch {
        return { isNewHighScore: false, highScore: score };
    }
};

export const getAllScores = async (): Promise<Record<ArcadeGameId, number>> => {
    try {
        const db = await getDB();
        const all = await db.getAll('scores');
        const map: Record<ArcadeGameId, number> = {
            'singer-snake': 0,
            'flappy-star': 0,
            'vibe-runner': 0,
        };
        all.forEach((item) => {
            map[item.gameId] = item.highScore;
        });
        return map;
    } catch {
        return { 'singer-snake': 0, 'flappy-star': 0, 'vibe-runner': 0 };
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
        const db = await getDB();
        const saved = await db.get('settings', 'config');
        return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const saveArcadeSettings = async (settings: ArcadeSettings): Promise<void> => {
    try {
        const db = await getDB();
        await db.put('settings', settings, 'config');
    } catch (e) {
        console.warn('Failed to save arcade settings', e);
    }
};
