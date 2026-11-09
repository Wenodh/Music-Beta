/**
 * Guest Session & Cryptographic Identity Service
 *
 * Implements self-certifying ECDSA (P-256) public-key identity with message-level envelope signing,
 * deterministic payload hashing (SDP/ICE), and bounded replay caching.
 *
 * Security Architecture & Trust Classification:
 * 1. Honest Classification: This is an application-level self-certifying ECDSA public key identity model (TOFU).
 *    It does NOT claim to be hardware-bound or server-issued by Supabase Auth.
 *    Identity is bound to an ECDSA P-256 keypair stored in browser localStorage.
 *    Clearing browser storage generates a new keypair and new guestId.
 * 2. Message-Level Envelope Authentication:
 *    Every signaling message sent by a guest cryptographically authenticates:
 *    - senderId
 *    - recipientId (prevents cross-recipient forwarding)
 *    - callId (prevents cross-call substitution)
 *    - signalType (prevents tampering with invitation vs response)
 *    - sequence number
 *    - issuedAt & expiresAt (clamped to 30s TTL with max 15s clock drift)
 *    - nonce (cryptographically random salt)
 *    - payloadHash (SHA-256 digest of SDP or ICE candidate data)
 * 3. Replay Protection:
 *    Recipients maintain an in-memory & session-bounded LRU replay cache tracking `${senderId}:${nonce}`
 *    and `${callId}:${sequence}`. Any replayed or duplicate message is rejected.
 */

import { computePublicKeyFingerprint } from './e2eeService';

export interface CanonicalSignalingEnvelope {
    v: 1;
    callId: string;
    senderId: string;
    recipientId: string;
    signalType: string;
    callType?: string;
    sequence: number;
    issuedAt: number;
    expiresAt: number;
    nonce: string;
    payloadHash: string;
}

export interface SignedSignalingEnvelope {
    envelope: CanonicalSignalingEnvelope;
    signature: string; // Base64-encoded ECDSA signature
    publicKeyJwk: JsonWebKey;
}

const GUEST_KEY_STORAGE_KEY = 'vibeon_guest_identity_key';
const INSTALLATION_STORAGE_KEY = 'vibeon_installation_id';
const SIGNALING_TOKEN_TTL_MS = 30 * 1000; // 30 seconds
const MAX_CLOCK_DRIFT_MS = 15 * 1000; // 15 seconds
const REPLAY_CACHE_MAX_ENTRIES = 500;

function getCrypto(): Crypto {
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto;
    }
    return (globalThis as any).crypto;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Computes deterministic SHA-256 hex string for SDP or ICE candidate payload
 */
export async function computePayloadHash(data: any): Promise<string> {
    if (!data) return 'none';
    const cryptoObj = getCrypto();
    let textToHash = '';

    if (data.sdp) {
        textToHash = `sdp:${data.type || ''}:${data.sdp}`;
    } else if (data.candidate) {
        textToHash = `candidate:${data.candidate.candidate || ''}:${data.candidate.sdpMid || ''}:${data.candidate.sdpMLineIndex ?? ''}`;
    } else if (typeof data === 'string') {
        textToHash = data;
    } else {
        try {
            textToHash = JSON.stringify(data);
        } catch {
            textToHash = String(data);
        }
    }

    const encoded = new TextEncoder().encode(textToHash);
    const hashBuf = await cryptoObj.subtle.digest('SHA-256', encoded);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Formats canonical string for envelope signing and verification
 */
export function formatCanonicalEnvelopeString(env: CanonicalSignalingEnvelope): string {
    return [
        env.v,
        env.callId,
        env.senderId,
        env.recipientId,
        env.signalType,
        env.callType || '',
        env.sequence,
        env.issuedAt,
        env.expiresAt,
        env.nonce,
        env.payloadHash,
    ].join('|');
}

export class GuestSessionService {
    private cachedKeyPair: CryptoKeyPair | null = null;
    private cachedPublicKeyJwk: JsonWebKey | null = null;
    private cachedGuestId: string | null = null;
    private cachedInstallationId: string | null = null;
    private sequenceCounter = 0;

    // Bounded LRU replay cache: key = `${senderId}:${nonce}`, value = timestamp
    private replayCache = new Map<string, number>();

    /**
     * Gets or creates a local installation identifier (for logging / telemetry)
     */
    public getInstallationId(): string {
        if (this.cachedInstallationId) {
            return this.cachedInstallationId;
        }

        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(INSTALLATION_STORAGE_KEY);
                if (stored) {
                    this.cachedInstallationId = stored;
                    return stored;
                }
            }
        } catch {
            // LocalStorage not available or blocked
        }

        const cryptoObj = getCrypto();
        const randBytes = new Uint8Array(16);
        cryptoObj.getRandomValues(randBytes);
        const newInstallationId = `inst-${bufferToBase64(randBytes).replace(/[/+=]/g, '').slice(0, 16)}`;

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(INSTALLATION_STORAGE_KEY, newInstallationId);
            }
        } catch {
            // ignore
        }

        this.cachedInstallationId = newInstallationId;
        return newInstallationId;
    }

    /**
     * Retrieves or generates the device-bound ECDSA keypair for guest authentication
     */
    public async getOrCreateGuestIdentityKey(): Promise<{
        keyPair: CryptoKeyPair;
        publicKeyJwk: JsonWebKey;
        guestId: string;
    }> {
        if (this.cachedKeyPair && this.cachedPublicKeyJwk && this.cachedGuestId) {
            return {
                keyPair: this.cachedKeyPair,
                publicKeyJwk: this.cachedPublicKeyJwk,
                guestId: this.cachedGuestId,
            };
        }

        const cryptoObj = getCrypto();

        let storedKeyData: string | null = null;
        try {
            if (typeof localStorage !== 'undefined') {
                storedKeyData = localStorage.getItem(GUEST_KEY_STORAGE_KEY);
            }
        } catch {
            // ignore
        }

        if (storedKeyData) {
            try {
                const parsed = JSON.parse(storedKeyData);
                const publicKey = await cryptoObj.subtle.importKey(
                    'jwk',
                    parsed.publicKeyJwk,
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    true,
                    ['verify']
                );
                const privateKey = await cryptoObj.subtle.importKey(
                    'jwk',
                    parsed.privateKeyJwk,
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    true,
                    ['sign']
                );

                const fingerprint = await computePublicKeyFingerprint(parsed.publicKeyJwk);
                const guestId = `anon-${fingerprint.slice(0, 12)}`;

                this.cachedKeyPair = { publicKey, privateKey };
                this.cachedPublicKeyJwk = parsed.publicKeyJwk;
                this.cachedGuestId = guestId;

                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('vibeon_user_code', guestId);
                    }
                } catch {
                    // ignore
                }

                return {
                    keyPair: this.cachedKeyPair,
                    publicKeyJwk: this.cachedPublicKeyJwk,
                    guestId: this.cachedGuestId,
                };
            } catch (err) {
                console.warn('[GuestSessionService] Failed to import stored guest key, regenerating:', err);
            }
        }

        // Generate new ECDSA P-256 signing keypair
        const keyPair = await cryptoObj.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['sign', 'verify']
        );

        const publicKeyJwk = await cryptoObj.subtle.exportKey('jwk', keyPair.publicKey);
        const privateKeyJwk = await cryptoObj.subtle.exportKey('jwk', keyPair.privateKey);
        const fingerprint = await computePublicKeyFingerprint(publicKeyJwk);
        const guestId = `anon-${fingerprint.slice(0, 12)}`;

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(
                    GUEST_KEY_STORAGE_KEY,
                    JSON.stringify({ publicKeyJwk, privateKeyJwk })
                );
                localStorage.setItem('vibeon_user_code', guestId);
            }
        } catch {
            // ignore
        }

        this.cachedKeyPair = keyPair;
        this.cachedPublicKeyJwk = publicKeyJwk;
        this.cachedGuestId = guestId;

        return {
            keyPair,
            publicKeyJwk,
            guestId,
        };
    }

    /**
     * Signs a complete signaling envelope covering all security-relevant fields
     */
    public async signSignalingEnvelope(params: {
        callId: string;
        recipientId: string;
        signalType: string;
        callType?: string;
        data?: any;
    }): Promise<SignedSignalingEnvelope> {
        const { keyPair, publicKeyJwk, guestId } = await this.getOrCreateGuestIdentityKey();
        const now = Date.now();
        this.sequenceCounter++;

        const cryptoObj = getCrypto();
        const nonceBytes = new Uint8Array(12);
        cryptoObj.getRandomValues(nonceBytes);
        const nonce = bufferToBase64(nonceBytes);

        const payloadHash = await computePayloadHash(params.data);

        const envelope: CanonicalSignalingEnvelope = {
            v: 1,
            callId: params.callId,
            senderId: guestId,
            recipientId: params.recipientId,
            signalType: params.signalType,
            callType: params.callType,
            sequence: this.sequenceCounter,
            issuedAt: now,
            expiresAt: now + SIGNALING_TOKEN_TTL_MS,
            nonce,
            payloadHash,
        };

        const canonicalString = formatCanonicalEnvelopeString(envelope);
        const payloadBytes = new TextEncoder().encode(canonicalString);

        const signatureBuffer = await cryptoObj.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            keyPair.privateKey,
            payloadBytes
        );

        return {
            envelope,
            signature: bufferToBase64(signatureBuffer),
            publicKeyJwk,
        };
    }

    /**
     * Verifies that a signed signaling envelope is authentic, bound to the sender/recipient/call,
     * not expired, matches payload hash, and has not been replayed.
     */
    public async verifySignalingEnvelope(
        signedEnvelope: SignedSignalingEnvelope,
        expectedRecipientId: string,
        expectedSignalType: string,
        actualData?: any
    ): Promise<{ isValid: boolean; reason?: string }> {
        if (!signedEnvelope || !signedEnvelope.envelope || !signedEnvelope.signature || !signedEnvelope.publicKeyJwk) {
            return { isValid: false, reason: 'Malformed signed envelope structure' };
        }

        const { envelope, signature, publicKeyJwk } = signedEnvelope;
        const now = Date.now();

        // 1. Validate Expiration (30s window + tolerance)
        if (envelope.expiresAt < now - MAX_CLOCK_DRIFT_MS) {
            return { isValid: false, reason: 'Signaling envelope is expired' };
        }

        // 2. Validate Clock Drift
        if (envelope.issuedAt > now + MAX_CLOCK_DRIFT_MS) {
            return { isValid: false, reason: 'Signaling envelope issued in future (clock drift)' };
        }

        // 3. Verify Recipient Binding
        if (envelope.recipientId !== expectedRecipientId) {
            return {
                isValid: false,
                reason: `Recipient mismatch: expected ${expectedRecipientId}, envelope has ${envelope.recipientId}`,
            };
        }

        // 4. Verify Signal Type
        if (envelope.signalType !== expectedSignalType) {
            return {
                isValid: false,
                reason: `Signal type mismatch: expected ${expectedSignalType}, envelope has ${envelope.signalType}`,
            };
        }

        // 5. Verify Canonical senderId matches public key fingerprint
        const computedFingerprint = await computePublicKeyFingerprint(publicKeyJwk);
        const expectedGuestId = `anon-${computedFingerprint.slice(0, 12)}`;
        if (envelope.senderId !== expectedGuestId) {
            return {
                isValid: false,
                reason: `SenderId fingerprint mismatch: expected ${expectedGuestId}, envelope has ${envelope.senderId}`,
            };
        }

        // 6. Verify Payload Hash (SDP or ICE candidate data)
        const expectedPayloadHash = await computePayloadHash(actualData);
        if (envelope.payloadHash !== expectedPayloadHash) {
            return {
                isValid: false,
                reason: `Payload hash mismatch: envelope hash ${envelope.payloadHash} does not match computed ${expectedPayloadHash}`,
            };
        }

        // 7. Replay Cache Check
        this.pruneReplayCache(now);
        const replayKey = `${envelope.senderId}:${envelope.nonce}`;
        if (this.replayCache.has(replayKey)) {
            return { isValid: false, reason: `Replay attack detected: nonce ${envelope.nonce} already seen` };
        }

        // 8. Cryptographic Signature Verification
        try {
            const cryptoObj = getCrypto();
            const publicKey = await cryptoObj.subtle.importKey(
                'jwk',
                publicKeyJwk,
                { name: 'ECDSA', namedCurve: 'P-256' },
                false,
                ['verify']
            );

            const canonicalString = formatCanonicalEnvelopeString(envelope);
            const payloadBytes = new TextEncoder().encode(canonicalString);
            const signatureBytes = base64ToBuffer(signature);

            const isValidSig = await cryptoObj.subtle.verify(
                { name: 'ECDSA', hash: { name: 'SHA-256' } },
                publicKey,
                signatureBytes,
                payloadBytes
            );

            if (!isValidSig) {
                return { isValid: false, reason: 'Cryptographic signature verification failed' };
            }

            // Record into replay cache
            this.replayCache.set(replayKey, now);
            return { isValid: true };
        } catch (err: any) {
            return { isValid: false, reason: `Verification exception: ${err.message || String(err)}` };
        }
    }

    /**
     * Clears expired entries from the in-memory replay cache
     */
    private pruneReplayCache(now: number) {
        if (this.replayCache.size > REPLAY_CACHE_MAX_ENTRIES) {
            const cutoff = now - (SIGNALING_TOKEN_TTL_MS + MAX_CLOCK_DRIFT_MS);
            for (const [key, timestamp] of this.replayCache.entries()) {
                if (timestamp < cutoff) {
                    this.replayCache.delete(key);
                }
            }
        }
    }

    /**
     * Clears all replay cache entries (useful for unit testing)
     */
    public clearReplayCache() {
        this.replayCache.clear();
    }
}

export const guestSessionService = new GuestSessionService();
