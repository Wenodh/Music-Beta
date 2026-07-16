export interface StorageAdapter {
    saveFile(id: string, blob: Blob): Promise<string>;
    getFile(id: string): Promise<Blob | undefined>;
    deleteFile(id: string): Promise<void>;
    getUsage(): Promise<number>;
    exists(id: string): Promise<boolean>;
}

import { db } from './db';

export class IndexedDBAdapter implements StorageAdapter {
    async saveFile(id: string, blob: Blob): Promise<string> {
        // For IndexedDB, we store the blob in the downloads table
        // But the adapter's job is just the file part.
        // However, in our Dexie schema, downloads table has both metadata and blob.
        // For a true abstraction, we might want a 'files' table.
        // For now, we'll assume the StorageService handles the high-level mapping.
        return id;
    }

    async getFile(id: string): Promise<Blob | undefined> {
        const entry = await db.downloads.get(id);
        return entry?.blob;
    }

    async deleteFile(id: string): Promise<void> {
        await db.downloads.delete(id);
    }

    async getUsage(): Promise<number> {
        const downloads = await db.downloads.toArray();
        return downloads.reduce((acc, curr) => acc + curr.size, 0);
    }

    async exists(id: string): Promise<boolean> {
        const count = await db.downloads.where('id').equals(id).count();
        return count > 0;
    }
}

export const defaultStorageAdapter = new IndexedDBAdapter();
