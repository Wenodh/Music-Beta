import { Song } from '../types/music';

const DB_NAME = 'vibeon_offline';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

export interface OfflineSong extends Song {
    audioBlob: Blob;
    imageBlob: Blob;
    downloadedAt: number;
    size: number;
}

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveSongOffline = async (song: Song, audioBlob: Blob, imageBlob: Blob): Promise<void> => {
    const db = await initDB();
    const offlineSong: OfflineSong = {
        ...song,
        audioBlob,
        imageBlob,
        downloadedAt: Date.now(),
        size: audioBlob.size + imageBlob.size,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(offlineSong);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getOfflineSongs = async (): Promise<OfflineSong[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getOfflineSong = async (id: string): Promise<OfflineSong | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteOfflineSong = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const deleteAllDownloads = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getDownloadStorageInfo = async (): Promise<{ count: number; totalSize: number }> => {
    const songs = await getOfflineSongs();
    const totalSize = songs.reduce((acc, song) => acc + (song.size || 0), 0);
    return {
        count: songs.length,
        totalSize,
    };
};
