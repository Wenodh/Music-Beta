import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Friend {
    id: string;
    name: string;
    avatar?: string;
    addedAt: number;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface DirectMessage {
    id: string;
    friendId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    status?: MessageStatus;
}

export type CallDirection = 'incoming' | 'outgoing';
export type CallOutcome = 'connected' | 'missed' | 'declined' | 'busy' | 'cancelled';

export interface CallLogEntry {
    id: string;
    callId: string;
    peerId: string;
    peerName: string;
    direction: CallDirection;
    outcome: CallOutcome;
    callType: 'audio' | 'video';
    startedAt: number;
    durationSeconds: number;
}

interface FriendsDBSchema extends DBSchema {
    friends: {
        key: string;
        value: Friend;
    };
    direct_messages: {
        key: string;
        value: DirectMessage;
        indexes: { 'by-friend': string };
    };
    call_history: {
        key: string;
        value: CallLogEntry;
        indexes: { 'by-peer': string; 'by-timestamp': number };
    };
}

const DB_NAME = 'vibeon_friends';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<FriendsDBSchema>> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<FriendsDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('friends')) {
                    db.createObjectStore('friends', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('direct_messages')) {
                    const store = db.createObjectStore('direct_messages', { keyPath: 'id' });
                    store.createIndex('by-friend', 'friendId');
                }
                if (!db.objectStoreNames.contains('call_history')) {
                    const callStore = db.createObjectStore('call_history', { keyPath: 'id' });
                    callStore.createIndex('by-peer', 'peerId');
                    callStore.createIndex('by-timestamp', 'startedAt');
                }
            },
        });
    }
    return dbPromise;
};

export const saveFriendLocal = async (friend: Friend) => {
    const db = await getDB();
    await db.put('friends', friend);
};

export const getFriendsLocal = async (): Promise<Friend[]> => {
    const db = await getDB();
    return await db.getAll('friends');
};

export const removeFriendLocal = async (id: string) => {
    const db = await getDB();
    await db.delete('friends', id);
};

export const saveDirectMessageLocal = async (msg: DirectMessage) => {
    const db = await getDB();
    await db.put('direct_messages', msg);
};

export const updateDirectMessageStatusLocal = async (msgId: string, status: MessageStatus) => {
    const db = await getDB();
    const msg = await db.get('direct_messages', msgId);
    if (msg) {
        msg.status = status;
        await db.put('direct_messages', msg);
    }
};

export const updateDirectMessagesStatusByFriendLocal = async (friendId: string, status: MessageStatus, forSenderId?: string) => {
    const db = await getDB();
    const messages = await db.getAllFromIndex('direct_messages', 'by-friend', friendId);
    const tx = db.transaction('direct_messages', 'readwrite');
    for (const msg of messages) {
        if (!forSenderId || msg.senderId === forSenderId) {
            if (msg.status !== 'seen') {
                msg.status = status;
                await tx.store.put(msg);
            }
        }
    }
    await tx.done;
};

export const getDirectMessagesLocal = async (friendId: string): Promise<DirectMessage[]> => {
    const db = await getDB();
    const messages = await db.getAllFromIndex('direct_messages', 'by-friend', friendId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
};

export const saveCallLogLocal = async (log: CallLogEntry): Promise<void> => {
    const db = await getDB();
    await db.put('call_history', log);
};

export const getCallHistoryLocal = async (): Promise<CallLogEntry[]> => {
    const db = await getDB();
    const logs = await db.getAll('call_history');
    return logs.sort((a, b) => b.startedAt - a.startedAt);
};

export const deleteCallLogLocal = async (id: string): Promise<void> => {
    const db = await getDB();
    await db.delete('call_history', id);
};

export const clearCallHistoryLocal = async (): Promise<void> => {
    const db = await getDB();
    await db.clear('call_history');
};
