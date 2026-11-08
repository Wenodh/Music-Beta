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
    seq?: number;
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

export interface StoredCryptoKey {
    id: string; // 'local_identity' or 'peer:<peerId>'
    keyType: 'identity_keypair' | 'peer_public_key';
    publicKeyJwk: JsonWebKey;
    fingerprint?: string; // SHA-256 hex fingerprint of canonical JWK
    verificationStatus?: 'unverified' | 'verified' | 'key_changed';
    previousFingerprints?: string[]; // Audit history of rotated keys
    privateKeyJwk?: JsonWebKey; // Only stored for local identity
    createdAt: number;
    updatedAt: number;
}

export interface BlockedUserRecord {
    userId: string;
    blockedAt: number;
    reason?: string;
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
    crypto_keys: {
        key: string;
        value: StoredCryptoKey;
    };
    blocked_users: {
        key: string;
        value: BlockedUserRecord;
    };
}

const DB_NAME = 'vibeon_friends';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<FriendsDBSchema>> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<FriendsDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db, _oldVersion) {
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
                if (!db.objectStoreNames.contains('crypto_keys')) {
                    db.createObjectStore('crypto_keys', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('blocked_users')) {
                    db.createObjectStore('blocked_users', { keyPath: 'userId' });
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

export const getMaxRecordedSequenceLocal = async (friendId: string): Promise<number> => {
    const messages = await getDirectMessagesLocal(friendId);
    if (messages.length === 0) return 0;
    return messages.reduce((max, m) => Math.max(max, m.seq || 0), 0);
};

export const getNextMessageSequenceLocal = async (friendId: string): Promise<number> => {
    const maxSeq = await getMaxRecordedSequenceLocal(friendId);
    return maxSeq + 1;
};

export const isMessageReplayOrDuplicateLocal = async (
    friendId: string,
    messageId: string,
    seq?: number
): Promise<{ isDuplicate: boolean; isReplay: boolean; maxSeq: number }> => {
    const db = await getDB();
    const existingById = await db.get('direct_messages', messageId);
    if (existingById) {
        return { isDuplicate: true, isReplay: false, maxSeq: 0 };
    }

    if (typeof seq === 'number' && seq > 0) {
        const maxSeq = await getMaxRecordedSequenceLocal(friendId);
        if (maxSeq > 0 && seq <= maxSeq) {
            // Sequence regression or replayed sequence number
            return { isDuplicate: false, isReplay: true, maxSeq };
        }
        return { isDuplicate: false, isReplay: false, maxSeq };
    }

    return { isDuplicate: false, isReplay: false, maxSeq: 0 };
};

export const getUnreadDirectMessageCountsLocal = async (currentUserId: string): Promise<Record<string, number>> => {
    const db = await getDB();
    const messages = await db.getAll('direct_messages');
    const counts: Record<string, number> = {};
    for (const msg of messages) {
        if (msg.senderId !== currentUserId && msg.status !== 'seen') {
            counts[msg.friendId] = (counts[msg.friendId] || 0) + 1;
        }
    }
    return counts;
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

// Crypto key storage
export const saveCryptoKeyLocal = async (keyRecord: StoredCryptoKey): Promise<void> => {
    const db = await getDB();
    await db.put('crypto_keys', keyRecord);
};

export const getCryptoKeyLocal = async (id: string): Promise<StoredCryptoKey | undefined> => {
    const db = await getDB();
    return await db.get('crypto_keys', id);
};

// Blocked users storage
export const blockUserLocal = async (userId: string, reason?: string): Promise<void> => {
    const db = await getDB();
    await db.put('blocked_users', {
        userId,
        blockedAt: Date.now(),
        reason,
    });
};

export const unblockUserLocal = async (userId: string): Promise<void> => {
    const db = await getDB();
    await db.delete('blocked_users', userId);
};

export const isUserBlockedLocal = async (userId: string): Promise<boolean> => {
    const db = await getDB();
    const rec = await db.get('blocked_users', userId);
    return Boolean(rec);
};

export const getBlockedUsersLocal = async (): Promise<BlockedUserRecord[]> => {
    const db = await getDB();
    return await db.getAll('blocked_users');
};
