import Dexie, { Table } from 'dexie';

export interface DownloadEntry {
    id: string; // mediaId
    provider: string;
    type: string;
    title: string;
    subtitle?: string;
    artworkUrl?: string;
    blob: Blob;
    mimeType: string;
    size: number;
    downloadedAt: number;
    metadata: any;
}

export interface SyncOperationEntry {
    id: string; // UUID
    type: string;
    action: string;
    payload: any;
    createdAt: number;
    retryCount: number;
}

export interface KeyValueEntry {
    key: string;
    value: any;
}

export class VibeDatabase extends Dexie {
    downloads!: Table<DownloadEntry>;
    syncQueue!: Table<SyncOperationEntry>;
    keyValue!: Table<KeyValueEntry>;

    constructor() {
        super('VibeDatabase');
        this.version(1).stores({
            downloads: 'id, provider, type, downloadedAt',
            syncQueue: 'id, type, action, createdAt',
            keyValue: 'key'
        });
    }
}

export const db = new VibeDatabase();

export const getDeviceId = async (): Promise<string> => {
    const entry = await db.keyValue.get('deviceId');
    if (entry) {
        return entry.value;
    }
    const newId = crypto.randomUUID();
    await db.keyValue.put({ key: 'deviceId', value: newId });
    return newId;
};
