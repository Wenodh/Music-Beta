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
    getMaxRecordedSequenceLocal: vi.fn(async (friendId: string) => {
        const list = Array.from(mockStores.direct_messages.values()).filter((m: any) => m.friendId === friendId);
        if (list.length === 0) return 0;
        return list.reduce((max, m) => Math.max(max, m.seq || 0), 0);
    }),
    getNextMessageSequenceLocal: vi.fn(async (friendId: string) => {
        const list = Array.from(mockStores.direct_messages.values()).filter((m: any) => m.friendId === friendId);
        if (list.length === 0) return 1;
        const maxSeq = list.reduce((max, m) => Math.max(max, m.seq || 0), 0);
        return maxSeq + 1;
    }),
    isMessageReplayOrDuplicateLocal: vi.fn(async (friendId: string, messageId: string, seq?: number) => {
        const existingById = mockStores.direct_messages.get(messageId);
        if (existingById) {
            return { isDuplicate: true, isReplay: false, maxSeq: 0 };
        }

        if (typeof seq === 'number' && seq > 0) {
            const list = Array.from(mockStores.direct_messages.values()).filter((m: any) => m.friendId === friendId);
            const maxSeq = list.reduce((max, m) => Math.max(max, m.seq || 0), 0);
            if (maxSeq > 0 && seq <= maxSeq) {
                return { isDuplicate: false, isReplay: true, maxSeq };
            }
            return { isDuplicate: false, isReplay: false, maxSeq };
        }

        return { isDuplicate: false, isReplay: false, maxSeq: 0 };
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

import { e2eeService, computePublicKeyFingerprint } from '../../../services/e2eeService';
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
        expect(identity.fingerprint).toBeDefined();
        expect(identity.fingerprint.length).toBe(64); // SHA-256 hex string

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
        expect(encrypted.keyFingerprint).toBeDefined();

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

    it('detects public key substitution and alerts on unexpected key changes without blind overwrite', async () => {
        const cryptoObj = globalThis.crypto;

        // Legitimate key for Charlie
        const charlieKeypair = await cryptoObj.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        const charliePublicJwk = await cryptoObj.subtle.exportKey('jwk', charlieKeypair.publicKey);

        // Initial key recording (first contact)
        const firstContact = await e2eeService.recordPeerPublicKey('charlie-user', charliePublicJwk);
        expect(firstContact.status).toBe('new');

        // Subsequent message with identical key
        const sameKey = await e2eeService.recordPeerPublicKey('charlie-user', charliePublicJwk);
        expect(sameKey.status).toBe('unchanged');

        // Attacker attempts to substitute Charlie's key
        const attackerKeypair = await cryptoObj.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );
        const attackerPublicJwk = await cryptoObj.subtle.exportKey('jwk', attackerKeypair.publicKey);

        // Key change attempt without allowOverwrite must be rejected
        const attackResult = await e2eeService.recordPeerPublicKey('charlie-user', attackerPublicJwk, false);
        expect(attackResult.status).toBe('changed');
        if (attackResult.status === 'changed') {
            expect(attackResult.oldFingerprint).not.toEqual(attackResult.newFingerprint);
        }

        // Pinned key remains Charlie's original key in storage
        const storedKey = await e2eeService.getStoredPeerKeyRecord('charlie-user');
        expect(storedKey?.fingerprint).toBe(firstContact.fingerprint);
    });

    it('rejects duplicate and replayed message sequences', async () => {
        const friendId = 'friend-seq-test';

        // Initial message seq 1
        const check1 = await friendsDb.isMessageReplayOrDuplicateLocal(friendId, 'msg-1', 1);
        expect(check1.isDuplicate).toBe(false);
        expect(check1.isReplay).toBe(false);

        await friendsDb.saveDirectMessageLocal({
            id: 'msg-1',
            friendId,
            senderId: friendId,
            senderName: 'Friend',
            text: 'First message',
            timestamp: Date.now(),
            seq: 1,
            status: 'delivered',
        });

        // Exact duplicate message ID
        const dupCheck = await friendsDb.isMessageReplayOrDuplicateLocal(friendId, 'msg-1', 1);
        expect(dupCheck.isDuplicate).toBe(true);

        // Message with regressive sequence number (replayed seq 1 under new ID)
        const replayCheck = await friendsDb.isMessageReplayOrDuplicateLocal(friendId, 'msg-replay-attack', 1);
        expect(replayCheck.isReplay).toBe(true);
        expect(replayCheck.maxSeq).toBe(1);

        // Legitimate next sequence message (seq 2)
        const nextCheck = await friendsDb.isMessageReplayOrDuplicateLocal(friendId, 'msg-2', 2);
        expect(nextCheck.isDuplicate).toBe(false);
        expect(nextCheck.isReplay).toBe(false);
    });

    it('computes deterministic SHA-256 public key fingerprints regardless of property order', async () => {
        const jwkA: JsonWebKey = {
            kty: 'EC',
            crv: 'P-256',
            x: 'W1Yf88Y073fQ0814mK9k211...',
            y: 'z82fQ0814mK9k211W1Yf88Y...',
        };
        const jwkB: JsonWebKey = {
            y: 'z82fQ0814mK9k211W1Yf88Y...',
            x: 'W1Yf88Y073fQ0814mK9k211...',
            crv: 'P-256',
            kty: 'EC',
        };

        const fpA = await computePublicKeyFingerprint(jwkA);
        const fpB = await computePublicKeyFingerprint(jwkB);

        expect(fpA).toBe(fpB);
        expect(fpA.length).toBe(64);
    });
});
