import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Friend {
    id: string;
    name: string;
    avatar?: string;
    addedAt: number;
}

export interface DirectMessage {
    id: string;
    friendId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
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
}

const DB_NAME = 'vibeon_friends';
const DB_VERSION = 1;

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

export const getDirectMessagesLocal = async (friendId: string): Promise<DirectMessage[]> => {
    const db = await getDB();
    const messages = await db.getAllFromIndex('direct_messages', 'by-friend', friendId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
};
