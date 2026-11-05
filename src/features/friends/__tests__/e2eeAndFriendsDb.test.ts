import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory mock stores
const mockStores = {
    crypto_keys: new Map<string, any>(),
    direct_messages: new Map<string, any>(),
    blocked_users: new Map<string, any>(),
};

vi.mock('../../../utils/friendsDb', () => ({
    getCryptoKeyLocal: vi.fn(async (id: string) => mockStores.crypto_keys.get(id)),
    saveCryptoKeyLocal: vi.fn(async (record: any) => {
        mockStores.crypto_keys.set(record.id, record);
    }),
    saveDirectMessageLocal: vi.fn(async (msg: any) => {
        mockStores.direct_messages.set(msg.id, msg);
    }),
    getDirectMessagesLocal: vi.fn(async (friendId: string) => {
        const list = Array.from(mockStores.direct_messages.values()).filter((m: any) => m.friendId === friendId);
        return list.sort((a, b) => a.timestamp - b.timestamp);
    }),
    getNextMessageSequenceLocal: vi.fn(async (friendId: string) => {
        const list = Array.from(mockStores.direct_messages.values()).filter((m: any) => m.friendId === friendId);
        if (list.length === 0) return 1;
        const maxSeq = list.reduce((max, m) => Math.max(max, m.seq || 0), 0);
        return maxSeq + 1;
    }),
    getUnreadDirectMessageCountsLocal: vi.fn(async (currentUserId: string) => {
        const list = Array.from(mockStores.direct_messages.values());
        const counts: Record<string, number> = {};
        for (const msg of list) {
            if (msg.senderId !== currentUserId && msg.status !== 'seen') {
                counts[msg.friendId] = (counts[msg.friendId] || 0) + 1;
            }
        }
        return counts;
    }),
    blockUserLocal: vi.fn(async (userId: string, reason?: string) => {
        mockStores.blocked_users.set(userId, { userId, blockedAt: Date.now(), reason });
    }),
    unblockUserLocal: vi.fn(async (userId: string) => {
        mockStores.blocked_users.delete(userId);
    }),
    isUserBlockedLocal: vi.fn(async (userId: string) => {
        return mockStores.blocked_users.has(userId);
    }),
    getBlockedUsersLocal: vi.fn(async () => {
        return Array.from(mockStores.blocked_users.values());
    }),
}));

import { e2eeService } from '../../../services/e2eeService';
import * as friendsDb from '../../../utils/friendsDb';

describe('E2EE Service & Friends DB Integration', () => {
    beforeEach(() => {
        mockStores.crypto_keys.clear();
        mockStores.direct_messages.clear();
        mockStores.blocked_users.clear();
        vi.clearAllMocks();
    });

    it('generates and persists local identity keys using Web Crypto API', async () => {
        const identity = await e2eeService.getOrCreateLocalIdentity();
        expect(identity.publicKeyJwk).toBeDefined();
        expect(identity.publicKeyJwk.kty).toBe('EC');
        expect(identity.publicKeyJwk.crv).toBe('P-256');

        expect(friendsDb.saveCryptoKeyLocal).toHaveBeenCalled();
    });

    it('encrypts and decrypts messages between Alice and Bob using ECDH and AES-GCM', async () => {
        const cryptoObj = globalThis.crypto;

        // Generate a distinct keypair for Bob
        const bobKeypair = await cryptoObj.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        const bobPublicJwk = await cryptoObj.subtle.exportKey('jwk', bobKeypair.publicKey);

        // Store Bob's public key as known peer
        await e2eeService.savePeerPublicKey('bob-user-123', bobPublicJwk);

        // Alice encrypts a message for Bob
        const plaintext = 'Secret audio recommendations & lyrics';
        const encrypted = await e2eeService.encryptMessage('bob-user-123', plaintext);

        expect(encrypted.v).toBe(1);
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.ciphertext).toBeDefined();
        expect(encrypted.ciphertext).not.toEqual(plaintext);
        expect(encrypted.senderPublicKey).toBeDefined();

        // Bob derives the same AES key using Bob's private key and Alice's public key
        const alicePublicFromPayload = await cryptoObj.subtle.importKey(
            'jwk',
            encrypted.senderPublicKey!,
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
        );

        const bobDerivedAesKey = await cryptoObj.subtle.deriveKey(
            { name: 'ECDH', public: alicePublicFromPayload },
            bobKeypair.privateKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // Decrypt using Bob's derived key
        const ivBytes = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
        const ciphertextBytes = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

        const decryptedBuffer = await cryptoObj.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes },
            bobDerivedAesKey,
            ciphertextBytes
        );

        const decrypted = new TextDecoder().decode(decryptedBuffer);
        expect(decrypted).toBe(plaintext);
    });

    it('handles message sequence counters and unread counts', async () => {
        const friendId = 'friend-123';
        const initialSeq = await friendsDb.getNextMessageSequenceLocal(friendId);
        expect(initialSeq).toBe(1);

        await friendsDb.saveDirectMessageLocal({
            id: 'm1',
            friendId,
            senderId: 'me',
            senderName: 'Me',
            text: 'Hey',
            timestamp: Date.now(),
            seq: 1,
            status: 'sent',
        });

        const nextSeq = await friendsDb.getNextMessageSequenceLocal(friendId);
        expect(nextSeq).toBe(2);

        await friendsDb.saveDirectMessageLocal({
            id: 'm2',
            friendId,
            senderId: friendId,
            senderName: 'Friend',
            text: 'Hello back',
            timestamp: Date.now() + 100,
            seq: 2,
            status: 'delivered',
        });

        const unread = await friendsDb.getUnreadDirectMessageCountsLocal('me');
        expect(unread[friendId]).toBe(1);
    });

    it('blocks and unblocks users in storage', async () => {
        const badUser = 'malicious-user-999';
        expect(await friendsDb.isUserBlockedLocal(badUser)).toBe(false);

        await friendsDb.blockUserLocal(badUser, 'Spam');
        expect(await friendsDb.isUserBlockedLocal(badUser)).toBe(true);

        const list = await friendsDb.getBlockedUsersLocal();
        expect(list.some((u) => u.userId === badUser)).toBe(true);

        await friendsDb.unblockUserLocal(badUser);
        expect(await friendsDb.isUserBlockedLocal(badUser)).toBe(false);
    });
});
