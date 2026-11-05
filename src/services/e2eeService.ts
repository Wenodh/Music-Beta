/**
 * End-to-End Encryption (E2EE) Service for Direct 1-on-1 Communication.
 *
 * Architecture:
 * - Key Exchange: Elliptic Curve Diffie-Hellman (ECDH) with curve P-256.
 * - Key Derivation: Shared secret derived via ECDH, expanded into a 256-bit AES key.
 * - Symmetric Encryption: AES-256-GCM with standard 12-byte random IV.
 * - Persistence: Local keypairs and peer public keys persist in IndexedDB ('crypto_keys' store).
 *   Raw private keys are NEVER transmitted over the wire.
 * - Protocol Payload:
 *   {
 *     v: 1,
 *     iv: '<base64>',
 *     ciphertext: '<base64>',
 *     senderPublicKey: '<JWK>'
 *   }
 */

import {
    getCryptoKeyLocal,
    saveCryptoKeyLocal,
    StoredCryptoKey,
} from '../utils/friendsDb';

export interface EncryptedPayload {
    v: number; // Protocol version
    iv: string; // Base64 12-byte initialization vector
    ciphertext: string; // Base64 AES-GCM ciphertext + auth tag
    senderPublicKey?: JsonWebKey; // Optional in-band public key exchange
}

const ECDH_PARAMS: EcKeyGenParams = {
    name: 'ECDH',
    namedCurve: 'P-256',
};

const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;

// Utility helpers for ArrayBuffer <-> Base64
const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToBuffer = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

class E2EEService {
    private localKeyPair: CryptoKeyPair | null = null;
    private localPublicKeyJwk: JsonWebKey | null = null;
    private derivedKeyCache = new Map<string, CryptoKey>();

    /**
     * Initializes or loads the local device identity keypair.
     */
    async getOrCreateLocalIdentity(): Promise<{ publicKeyJwk: JsonWebKey; keyPair: CryptoKeyPair }> {
        if (this.localKeyPair && this.localPublicKeyJwk) {
            return {
                publicKeyJwk: this.localPublicKeyJwk,
                keyPair: this.localKeyPair,
            };
        }

        const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
        const stored = await getCryptoKeyLocal('local_identity');
        if (stored?.publicKeyJwk && stored.privateKeyJwk) {
            try {
                const publicKey = await cryptoObj.subtle.importKey(
                    'jwk',
                    stored.publicKeyJwk,
                    ECDH_PARAMS,
                    true,
                    []
                );
                const privateKey = await cryptoObj.subtle.importKey(
                    'jwk',
                    stored.privateKeyJwk,
                    ECDH_PARAMS,
                    true,
                    ['deriveKey', 'deriveBits']
                );
                this.localKeyPair = { publicKey, privateKey };
                this.localPublicKeyJwk = stored.publicKeyJwk;
                return {
                    publicKeyJwk: this.localPublicKeyJwk,
                    keyPair: this.localKeyPair,
                };
            } catch (err) {
                console.warn('[E2EE] Failed to import stored identity keys, generating new pair:', err);
            }
        }

        // Generate new ECDH P-256 Keypair
        const keyPair = await cryptoObj.subtle.generateKey(
            ECDH_PARAMS,
            true,
            ['deriveKey', 'deriveBits']
        );

        const publicKeyJwk = await cryptoObj.subtle.exportKey('jwk', keyPair.publicKey);
        const privateKeyJwk = await cryptoObj.subtle.exportKey('jwk', keyPair.privateKey);

        const record: StoredCryptoKey = {
            id: 'local_identity',
            keyType: 'identity_keypair',
            publicKeyJwk,
            privateKeyJwk,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await saveCryptoKeyLocal(record);
        this.localKeyPair = keyPair;
        this.localPublicKeyJwk = publicKeyJwk;

        return {
            publicKeyJwk,
            keyPair,
        };
    }

    /**
     * Retrieves the cached or stored public key for a peer.
     */
    async getPeerPublicKey(peerId: string): Promise<CryptoKey | null> {
        const stored = await getCryptoKeyLocal(`peer:${peerId}`);
        if (!stored?.publicKeyJwk) return null;

        try {
            const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
            return await cryptoObj.subtle.importKey(
                'jwk',
                stored.publicKeyJwk,
                ECDH_PARAMS,
                true,
                []
            );
        } catch (e) {
            console.error('[E2EE] Failed to import peer public key:', e);
            return null;
        }
    }

    /**
     * Saves a peer's public key (e.g. received via in-band message or handshake).
     */
    async savePeerPublicKey(peerId: string, publicKeyJwk: JsonWebKey): Promise<void> {
        const record: StoredCryptoKey = {
            id: `peer:${peerId}`,
            keyType: 'peer_public_key',
            publicKeyJwk,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await saveCryptoKeyLocal(record);
        // Invalidate cached derived symmetric key
        this.derivedKeyCache.delete(peerId);
    }

    /**
     * Derives a 256-bit AES-GCM symmetric session key from local private key and peer's public key.
     */
    private async deriveSharedAesKey(peerId: string, peerPublicKey: CryptoKey): Promise<CryptoKey> {
        const cached = this.derivedKeyCache.get(peerId);
        if (cached) return cached;

        const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
        const { keyPair } = await this.getOrCreateLocalIdentity();

        const aesKey = await cryptoObj.subtle.deriveKey(
            {
                name: 'ECDH',
                public: peerPublicKey,
            },
            keyPair.privateKey,
            {
                name: AES_ALGORITHM,
                length: AES_KEY_LENGTH,
            },
            false,
            ['encrypt', 'decrypt']
        );

        this.derivedKeyCache.set(peerId, aesKey);
        return aesKey;
    }

    /**
     * Encrypts plaintext message for the specified recipient.
     * Attaches our public key so the recipient can derive the same shared key in-band.
     */
    async encryptMessage(peerId: string, plaintext: string, knownPeerPublicKey?: JsonWebKey): Promise<EncryptedPayload> {
        const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
        const { publicKeyJwk } = await this.getOrCreateLocalIdentity();

        let peerKey: CryptoKey | null = null;
        if (knownPeerPublicKey) {
            await this.savePeerPublicKey(peerId, knownPeerPublicKey);
            peerKey = await cryptoObj.subtle.importKey(
                'jwk',
                knownPeerPublicKey,
                ECDH_PARAMS,
                true,
                []
            );
        } else {
            peerKey = await this.getPeerPublicKey(peerId);
        }

        if (!peerKey) {
            throw new Error(`Cannot encrypt message for ${peerId}: Peer public key not available`);
        }

        const sharedAesKey = await this.deriveSharedAesKey(peerId, peerKey);

        // Standard 12-byte initialization vector for AES-GCM
        const iv = cryptoObj.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(plaintext);

        const ciphertextBuffer = await cryptoObj.subtle.encrypt(
            {
                name: AES_ALGORITHM,
                iv,
            },
            sharedAesKey,
            encodedText
        );

        return {
            v: 1,
            iv: bufferToBase64(iv),
            ciphertext: bufferToBase64(ciphertextBuffer),
            senderPublicKey: publicKeyJwk,
        };
    }

    /**
     * Decrypts an encrypted payload received from a sender.
     */
    async decryptMessage(senderId: string, payload: EncryptedPayload): Promise<string> {
        if (!payload || !payload.ciphertext || !payload.iv) {
            throw new Error('Invalid encrypted payload');
        }

        // If the message contains sender's public key, store/update it
        if (payload.senderPublicKey) {
            await this.savePeerPublicKey(senderId, payload.senderPublicKey);
        }

        const peerKey = await this.getPeerPublicKey(senderId);
        if (!peerKey) {
            throw new Error(`Cannot decrypt message from ${senderId}: No public key found for sender`);
        }

        const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
        const sharedAesKey = await this.deriveSharedAesKey(senderId, peerKey);
        const iv = base64ToBuffer(payload.iv);
        const ciphertext = base64ToBuffer(payload.ciphertext);

        const decryptedBuffer = await cryptoObj.subtle.decrypt(
            {
                name: AES_ALGORITHM,
                iv,
            },
            sharedAesKey,
            ciphertext
        );

        return new TextDecoder().decode(decryptedBuffer);
    }
}

export const e2eeService = new E2EEService();
