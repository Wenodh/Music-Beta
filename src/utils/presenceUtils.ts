/**
 * Presence Aggregation & Validation Engine
 *
 * Provides deterministic, multi-device presence aggregation and stale-session filtering.
 *
 * Rationale:
 * - Heartbeat interval is 30 seconds.
 * - Stale presence threshold is configured to 90 seconds (3 missed heartbeats).
 *   This accounts for transient network hiccups, tab throttling, and brief reconnections
 *   without prematurely marking an active user as offline.
 * - A user with multiple open tabs or devices is online if ANY valid session is online and fresh.
 *   A stale or closed session must NEVER override a fresh active session.
 */

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
export const PRESENCE_STALE_THRESHOLD_MS = 90 * 1000; // 90 seconds (3 missed heartbeats)
export const MAX_FUTURE_CLOCK_DRIFT_MS = 15 * 1000; // 15 seconds max tolerated future clock drift

export interface RawPresenceSession {
    userId?: string;
    online?: boolean;
    lastSeen?: number | string;
    currentSong?: any;
    updatedAt?: number | string;
    songUpdatedAt?: number | string;
    playbackStopped?: boolean;
    [key: string]: any;
}

export interface AggregatedPresence {
    online: boolean;
    lastSeen: number;
    currentSong: any | null;
}

/**
 * Aggregates an array of presence sessions for a given user.
 *
 * Requirements:
 * 1. Filter out sessions with online === false explicitly (offline sessions are excluded from online status & song activity).
 * 2. Reject invalid timestamps (NaN, <= 0) and future timestamps (lastSeen > now + MAX_FUTURE_CLOCK_DRIFT_MS).
 * 3. Filter out stale sessions where (now - lastSeen) >= staleThresholdMs.
 * 4. Multi-device song precedence:
 *    - Strict inequality: an active song overrides an explicit stop ONLY if songUpdatedAt > newestStopTimestamp.
 *    - A tie (songUpdatedAt === newestStopTimestamp) MUST favor the stop.
 *    - Legacy sessions without songUpdatedAt must NEVER resurrect an old song through a newer heartbeat.
 *
 * @param sessions Array of raw session payloads from Supabase presenceState[userId]
 * @param now Current epoch timestamp (injected for deterministic testing)
 * @param staleThresholdMs Stale cutoff duration in milliseconds (defaults to 90s)
 */
export function aggregateUserPresenceSessions(
    sessions: RawPresenceSession[] | undefined | null,
    now: number = Date.now(),
    staleThresholdMs: number = PRESENCE_STALE_THRESHOLD_MS
): AggregatedPresence {
    if (!Array.isArray(sessions) || sessions.length === 0) {
        return {
            online: false,
            lastSeen: 0,
            currentSong: null,
        };
    }

    const validFreshOnlineSessions: { session: RawPresenceSession; validLastSeen: number }[] = [];
    let highestKnownLastSeen = 0;

    for (const session of sessions) {
        if (!session || typeof session !== 'object') continue;

        // Explicitly offline sessions are ignored from online calculation
        if (session.online === false) {
            continue;
        }

        // Normalize lastSeen (or updatedAt fallback)
        const rawLastSeen = session.lastSeen ?? session.updatedAt;
        const numLastSeen = Number(rawLastSeen);

        // Reject NaN, <= 0, and future timestamps beyond max tolerance
        if (isNaN(numLastSeen) || numLastSeen <= 0 || numLastSeen > now + MAX_FUTURE_CLOCK_DRIFT_MS) {
            continue;
        }

        if (numLastSeen > highestKnownLastSeen) {
            highestKnownLastSeen = numLastSeen;
        }

        // Must be fresh within the stale threshold
        const isFresh = (now - numLastSeen) < staleThresholdMs;
        if (isFresh) {
            validFreshOnlineSessions.push({ session, validLastSeen: numLastSeen });
        }
    }

    if (validFreshOnlineSessions.length > 0) {
        // Find the freshest session (highest valid lastSeen)
        let best = validFreshOnlineSessions[0];
        for (let i = 1; i < validFreshOnlineSessions.length; i++) {
            if (validFreshOnlineSessions[i].validLastSeen > best.validLastSeen) {
                best = validFreshOnlineSessions[i];
            }
        }

        // Multi-device song metadata resolution:
        // 1. Identify explicit stop timestamps across sessions.
        //    Explicit stops are marked by playbackStopped === true and have a valid songUpdatedAt (or validLastSeen as fallback).
        // 2. Identify candidate active songs.
        //    Candidate must have a valid object with truthy id.
        //    Song timestamp:
        //      - If session has songUpdatedAt or s.updatedAt, parse that as playback timestamp.
        //      - If explicitPlaybackTime is missing (legacy session), fallback to validLastSeen IF AND ONLY IF
        //        there has been no explicit stop. If an explicit stop exists, legacy sessions without songUpdatedAt
        //        cannot use heartbeat lastSeen to resurrect a song (timestamp defaults to 0).
        // 3. Precedence:
        //    - Active song wins ONLY if songTimestamp > newestExplicitStopTime (STRICT inequality).
        //    - If songTimestamp <= newestExplicitStopTime (including same-millisecond tie), STOP WINS.

        let newestActiveSong: any = null;
        let newestActiveSongTime = -1;
        let newestExplicitStopTime = -1;

        // First pass: find newest explicit stop timestamp
        for (const item of validFreshOnlineSessions) {
            const sess = item.session;
            const s = sess.currentSong;

            if (sess.playbackStopped === true || (sess.songUpdatedAt && s === null)) {
                const stopTime = Number(sess.songUpdatedAt);
                const validStopTime = (!isNaN(stopTime) && stopTime > 0) ? stopTime : item.validLastSeen;
                if (validStopTime > newestExplicitStopTime) {
                    newestExplicitStopTime = validStopTime;
                }
            }
        }

        // Second pass: evaluate candidate active songs
        for (const item of validFreshOnlineSessions) {
            const sess = item.session;
            const s = sess.currentSong;

            if (s && typeof s === 'object' && s.id) {
                const explicitPlaybackTime = sess.songUpdatedAt ?? s.updatedAt;
                let validSongTime = 0;

                if (explicitPlaybackTime !== undefined && explicitPlaybackTime !== null) {
                    const parsed = Number(explicitPlaybackTime);
                    if (!isNaN(parsed) && parsed > 0) {
                        validSongTime = parsed;
                    }
                } else {
                    // Legacy session without explicit songUpdatedAt:
                    // Only allowed to use item.validLastSeen if no modern explicit stop has occurred (newestExplicitStopTime === -1).
                    // If an explicit stop exists, legacy heartbeats cannot resurrect the song (validSongTime remains 0).
                    if (newestExplicitStopTime === -1) {
                        validSongTime = item.validLastSeen;
                    }
                }

                if (validSongTime > newestActiveSongTime) {
                    newestActiveSongTime = validSongTime;
                    newestActiveSong = s;
                }
            }
        }

        // Strict inequality check: active song timestamp must be STRICTLY GREATER than newest stop timestamp
        let finalSong = null;
        if (newestActiveSong && newestActiveSongTime > newestExplicitStopTime) {
            finalSong = newestActiveSong;
        }

        return {
            online: true,
            lastSeen: best.validLastSeen,
            currentSong: finalSong,
        };
    }

    return {
        online: false,
        lastSeen: highestKnownLastSeen || now,
        currentSong: null,
    };
}
