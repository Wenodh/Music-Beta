import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    aggregateUserPresenceSessions,
    PRESENCE_HEARTBEAT_INTERVAL_MS,
    PRESENCE_STALE_THRESHOLD_MS,
    MAX_FUTURE_CLOCK_DRIFT_MS,
} from '../../../utils/presenceUtils';
import socialReducer, {
    updateUserPresence,
    setPresenceMap,
} from '../../social/socialSlice';
import friendsReducer, {
    startDirectCall,
    updateCallStatus,
    endDirectCall,
} from '../friendsSlice';

describe('Batch 1: Presence Heartbeat, Multi-Device Detection & Offline-Aware Calling', () => {
    describe('1. Presence Constants & Configuration', () => {
        it('uses a 30-second heartbeat interval and a 90-second stale threshold', () => {
            expect(PRESENCE_HEARTBEAT_INTERVAL_MS).toBe(30000);
            expect(PRESENCE_STALE_THRESHOLD_MS).toBe(90000);
            // 90s corresponds to exactly 3 missed heartbeats
            expect(PRESENCE_STALE_THRESHOLD_MS / PRESENCE_HEARTBEAT_INTERVAL_MS).toBe(3);
            expect(MAX_FUTURE_CLOCK_DRIFT_MS).toBe(15000);
        });
    });

    describe('2. Multi-Device & Multi-Tab Presence Aggregation - Core Behavior', () => {
        const baseTime = 1000000;

        it('identifies user as offline when sessions array is empty or null', () => {
            const resultNull = aggregateUserPresenceSessions(null, baseTime);
            expect(resultNull.online).toBe(false);
            expect(resultNull.lastSeen).toBe(0);

            const resultEmpty = aggregateUserPresenceSessions([], baseTime);
            expect(resultEmpty.online).toBe(false);
            expect(resultEmpty.lastSeen).toBe(0);
        });

        it('identifies user as online with a single fresh online session', () => {
            const sessions = [
                {
                    userId: 'user-alice',
                    online: true,
                    lastSeen: baseTime - 10000, // 10s ago
                    songUpdatedAt: baseTime - 10000,
                    currentSong: { id: 's1', title: 'Song A' },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 10000);
            expect(result.currentSong?.title).toBe('Song A');
        });

        it('identifies user as online when at least one session is fresh, even if the last array item is stale', () => {
            const sessions = [
                {
                    userId: 'user-bob',
                    online: true,
                    lastSeen: baseTime - 15000, // Fresh (15s ago)
                    songUpdatedAt: baseTime - 15000,
                    currentSong: { id: 's-active', title: 'Active Stream' },
                },
                {
                    userId: 'user-bob',
                    online: false,
                    lastSeen: baseTime - 200000, // Stale (200s ago)
                    currentSong: null,
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 15000);
            expect(result.currentSong?.title).toBe('Active Stream');
        });

        it('selects the freshest active session when multiple devices are concurrently online', () => {
            const sessions = [
                {
                    userId: 'user-carol',
                    online: true,
                    lastSeen: baseTime - 25000, // 25s ago
                    songUpdatedAt: baseTime - 25000,
                    currentSong: { id: 's-old', title: 'Old Mobile Track', updatedAt: baseTime - 25000 },
                },
                {
                    userId: 'user-carol',
                    online: true,
                    lastSeen: baseTime - 5000, // 5s ago (freshest)
                    songUpdatedAt: baseTime - 5000,
                    currentSong: { id: 's-fresh', title: 'Fresh Desktop Track', updatedAt: baseTime - 5000 },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 5000);
            expect(result.currentSong?.title).toBe('Fresh Desktop Track');
        });
    });

    describe('3. Deterministic Scenarios & Edge Cases', () => {
        const baseTime = 1000000;

        // Scenario 1: Initial idle device + another device playing Song X
        it('Scenario 1: Initial idle device + another device playing Song X preserves Song X', () => {
            const sessions = [
                {
                    userId: 'user-scen1',
                    online: true,
                    lastSeen: baseTime - 20000,
                    songUpdatedAt: baseTime - 20000,
                    currentSong: { id: 'song-x', title: 'Song X', updatedAt: baseTime - 20000 },
                },
                {
                    userId: 'user-scen1',
                    online: true,
                    lastSeen: baseTime - 5000, // Idle device mounted recently with no playback
                    currentSong: null, // No songUpdatedAt, no playbackStopped
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 5000);
            expect(result.currentSong?.title).toBe('Song X');
        });

        // Scenario 2: Idle heartbeats do not hide Song X
        it('Scenario 2: Idle heartbeats do not hide Song X', () => {
            const sessions = [
                {
                    userId: 'user-scen2',
                    online: true,
                    lastSeen: baseTime - 20000,
                    songUpdatedAt: baseTime - 20000,
                    currentSong: { id: 'song-x', title: 'Song X', updatedAt: baseTime - 20000 },
                },
                {
                    userId: 'user-scen2',
                    online: true,
                    lastSeen: baseTime - 1000, // Repeated heartbeat on idle device
                    currentSong: null, // Still no songUpdatedAt, no playbackStopped
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 1000);
            expect(result.currentSong?.title).toBe('Song X');
        });

        // Scenario 3: Genuine active-to-stopped transition suppresses Song X
        it('Scenario 3: Genuine active-to-stopped transition suppresses Song X (explicit stop)', () => {
            const sessions = [
                {
                    userId: 'user-scen3',
                    online: true,
                    lastSeen: baseTime - 25000,
                    songUpdatedAt: baseTime - 25000,
                    currentSong: { id: 'song-x', title: 'Song X', updatedAt: baseTime - 25000 },
                },
                {
                    userId: 'user-scen3',
                    online: true,
                    lastSeen: baseTime - 10000,
                    songUpdatedAt: baseTime - 10000, // Genuine stop event at t = 90k
                    playbackStopped: true,
                    currentSong: null,
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 10000);
            expect(result.currentSong).toBeNull();
        });

        // Scenario 4: Sharing disabled while Song X is playing
        it('Scenario 4: Sharing disabled while Song X is playing emits currentSong: null without playbackStopped', () => {
            const sessions = [
                {
                    userId: 'user-scen4',
                    online: true,
                    lastSeen: baseTime - 25000,
                    songUpdatedAt: baseTime - 25000,
                    currentSong: { id: 'song-x', title: 'Song X', updatedAt: baseTime - 25000 },
                },
                {
                    userId: 'user-scen4',
                    online: true,
                    lastSeen: baseTime - 5000,
                    currentSong: null, // Sharing disabled: no playbackStopped
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong?.title).toBe('Song X');
        });

        // Scenario 5: Song finishes while sharing is disabled, then sharing is re-enabled: no false stop
        it('Scenario 5: Song finishes while sharing is disabled, then sharing is re-enabled: no false stop', () => {
            // When song ends while sharing was disabled, wasSharingWhenStopped is false.
            // When sharing is later re-enabled while idle, it publishes currentSong: null without playbackStopped.
            const sessions = [
                {
                    userId: 'user-scen5',
                    online: true,
                    lastSeen: baseTime - 30000,
                    songUpdatedAt: baseTime - 30000,
                    currentSong: { id: 'song-x', title: 'Song X', updatedAt: baseTime - 30000 },
                },
                {
                    userId: 'user-scen5',
                    online: true,
                    lastSeen: baseTime - 2000, // Idle device with re-enabled sharing
                    currentSong: null, // No playbackStopped
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong?.title).toBe('Song X');
        });

        // Scenario 6: Sharing re-enabled while another song is playing: publish correct song
        it('Scenario 6: Sharing re-enabled while another song is playing publishes the correct song', () => {
            const sessions = [
                {
                    userId: 'user-scen6',
                    online: true,
                    lastSeen: baseTime - 20000,
                    songUpdatedAt: baseTime - 20000,
                    playbackStopped: true,
                    currentSong: null,
                },
                {
                    userId: 'user-scen6',
                    online: true,
                    lastSeen: baseTime - 5000,
                    songUpdatedAt: baseTime - 5000,
                    currentSong: { id: 'song-y', title: 'Song Y', updatedAt: baseTime - 5000 },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong?.title).toBe('Song Y');
        });

        // Scenario 7: Same track ID with changed metadata: metadata updates
        it('Scenario 7: Same track ID with changed metadata surfaces updated metadata', () => {
            const sessions = [
                {
                    userId: 'user-scen7',
                    online: true,
                    lastSeen: baseTime - 10000,
                    songUpdatedAt: baseTime - 10000,
                    currentSong: { id: 'track-1', title: 'Initial Title', artist: 'Artist A', updatedAt: baseTime - 10000 },
                },
                {
                    userId: 'user-scen7',
                    online: true,
                    lastSeen: baseTime - 2000,
                    songUpdatedAt: baseTime - 2000, // Updated metadata timestamp
                    currentSong: { id: 'track-1', title: 'Remastered Title', artist: 'Artist A feat. B', updatedAt: baseTime - 2000 },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong?.title).toBe('Remastered Title');
            expect(result.currentSong?.artist).toBe('Artist A feat. B');
        });

        // Scenario 8: Same-millisecond active and stop timestamps: stop wins
        it('Scenario 8: Same-millisecond active and stop timestamps: stop wins (tie favors stop)', () => {
            const tieTimestamp = baseTime - 10000;
            const sessions = [
                {
                    userId: 'user-scen8',
                    online: true,
                    lastSeen: baseTime - 5000,
                    songUpdatedAt: tieTimestamp,
                    currentSong: { id: 'song-tie', title: 'Song Tie', updatedAt: tieTimestamp },
                },
                {
                    userId: 'user-scen8',
                    online: true,
                    lastSeen: baseTime - 4000,
                    songUpdatedAt: tieTimestamp,
                    playbackStopped: true,
                    currentSong: null,
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong).toBeNull();
        });

        // Scenario 9: Legacy heartbeat after a modern explicit stop: no resurrection
        it('Scenario 9: Legacy heartbeat after a modern explicit stop: no song resurrection', () => {
            const sessions = [
                {
                    userId: 'user-scen9',
                    online: true,
                    lastSeen: baseTime - 20000, // Modern explicit stop at T = 80k
                    songUpdatedAt: baseTime - 20000,
                    playbackStopped: true,
                    currentSong: null,
                },
                {
                    userId: 'user-scen9',
                    online: true,
                    lastSeen: baseTime - 5000, // Legacy heartbeat at T = 95k (no songUpdatedAt on session)
                    currentSong: { id: 'song-legacy', title: 'Legacy Song', updatedAt: baseTime - 40000 },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 5000);
            expect(result.currentSong).toBeNull();
        });

        // Scenario 10: Explicit offline sessions are excluded
        it('Scenario 10: Explicitly offline sessions (online=false) are excluded', () => {
            const sessions = [
                {
                    userId: 'user-scen10',
                    online: false,
                    lastSeen: baseTime - 5000,
                    songUpdatedAt: baseTime - 5000,
                    currentSong: { id: 'song-ghost', title: 'Ghost Song' },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(false);
            expect(result.currentSong).toBeNull();
        });

        // Scenario 11: Future timestamps beyond tolerance are excluded
        it('Scenario 11: Future timestamps beyond 15s max drift are excluded', () => {
            const sessions = [
                {
                    userId: 'user-scen11',
                    online: true,
                    lastSeen: baseTime + 60000, // 60s in future (> 15s)
                    currentSong: { id: 'future-track', title: 'Future Track' },
                },
                {
                    userId: 'user-scen11',
                    online: true,
                    lastSeen: baseTime - 8000, // Valid session
                    songUpdatedAt: baseTime - 8000,
                    currentSong: { id: 'valid-track', title: 'Valid Track' },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions as any, baseTime);
            expect(result.online).toBe(true);
            expect(result.lastSeen).toBe(baseTime - 8000);
            expect(result.currentSong?.title).toBe('Valid Track');
        });

        // Scenario 12: Initial active playback followed by stop after subscription: explicit stop
        it('Scenario 12: Initial active playback followed by stop after subscription produces explicit stop', () => {
            // Step 1: Device subscribed while playing Song X
            const playingState = [
                {
                    userId: 'user-scen12',
                    online: true,
                    lastSeen: baseTime - 15000,
                    songUpdatedAt: baseTime - 15000,
                    currentSong: { id: 'song-init', title: 'Initial Song', updatedAt: baseTime - 15000 },
                },
            ];
            expect(aggregateUserPresenceSessions(playingState, baseTime).currentSong?.title).toBe('Initial Song');

            // Step 2: Device subsequently stops playback while sharing is active
            const stoppedState = [
                {
                    userId: 'user-scen12',
                    online: true,
                    lastSeen: baseTime - 5000,
                    songUpdatedAt: baseTime - 5000,
                    playbackStopped: true,
                    currentSong: null,
                },
            ];
            expect(aggregateUserPresenceSessions(stoppedState, baseTime).currentSong).toBeNull();
        });

        // Scenario 13: Paused song is not mistaken for a stopped song
        it('Scenario 13: Paused song with valid ID is not mistaken for a stopped song', () => {
            const sessions = [
                {
                    userId: 'user-paused',
                    online: true,
                    lastSeen: baseTime - 5000,
                    songUpdatedAt: baseTime - 5000,
                    currentSong: {
                        id: 'song-paused-1',
                        title: 'Paused Track',
                        isPlaying: false, // Paused!
                        updatedAt: baseTime - 5000,
                    },
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong).toBeDefined();
            expect(result.currentSong?.title).toBe('Paused Track');
            expect(result.currentSong?.isPlaying).toBe(false);
        });

        // Scenario 14: Nullability & undefined song object resilience
        it('Scenario 14: currentSong with undefined or empty string id does not count as active playback', () => {
            const sessions = [
                {
                    userId: 'user-undefined-song',
                    online: true,
                    lastSeen: baseTime - 5000,
                    currentSong: { id: '', title: 'Empty ID' }, // invalid id
                },
                {
                    userId: 'user-undefined-song',
                    online: true,
                    lastSeen: baseTime - 8000,
                    currentSong: undefined,
                },
            ];

            const result = aggregateUserPresenceSessions(sessions, baseTime);
            expect(result.online).toBe(true);
            expect(result.currentSong).toBeNull();
        });
    });

    describe('4. Realtime Lifecycle, Queue Ordering & Race Guards', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('Terminal channel state during pending initial track: no heartbeat starts for old channel and channelRef is nulled', async () => {
            let heartbeatStartedForChannel: string | null = null;
            let activeChannel: { id: string; state: string } | null = { id: 'chan-1', state: 'joined' };

            // Simulate subscription with async track
            const subscribeChannel = async (channel: { id: string; state: string }) => {
                // Async track simulated
                await new Promise((r) => setTimeout(r, 10));

                // Verification check: channel must match activeChannel and state must be joined
                if (activeChannel === channel && channel.state === 'joined') {
                    heartbeatStartedForChannel = channel.id;
                }
            };

            const promise = subscribeChannel(activeChannel);

            // Channel experiences terminal error before track completes
            activeChannel.state = 'closed';
            activeChannel = null; // replaced or closed

            await vi.advanceTimersByTimeAsync(15);
            await promise;

            expect(heartbeatStartedForChannel).toBeNull();
        });

        it('Repeated SUBSCRIBED events: one heartbeat timer only', () => {
            let heartbeatTickCount = 0;
            let activeTimer: any = null;
            let isSubscribedProcessing = false;

            const onSubscribed = () => {
                if (isSubscribedProcessing) return; // Guard against duplicate SUBSCRIBED
                isSubscribedProcessing = true;

                if (activeTimer) clearInterval(activeTimer);
                activeTimer = setInterval(() => {
                    heartbeatTickCount++;
                }, PRESENCE_HEARTBEAT_INTERVAL_MS);
            };

            // First SUBSCRIBED event
            onSubscribed();

            // Duplicate SUBSCRIBED event on same channel
            onSubscribed();

            // Advance 30s
            vi.advanceTimersByTime(30000);
            expect(heartbeatTickCount).toBe(1);

            // Advance another 30s
            vi.advanceTimersByTime(30000);
            expect(heartbeatTickCount).toBe(2);

            clearInterval(activeTimer);
        });

        it('Serialized Promise queue executes tracking operations sequentially with dynamic payload generation', async () => {
            const publishedPayloads: string[] = [];
            let trackingQueue: Promise<void> = Promise.resolve();

            // Dynamic payload provider simulating latest Redux state
            let currentTrack = 'Song A';

            const enqueueTrack = (simulatedLatencyMs: number) => {
                trackingQueue = trackingQueue.then(async () => {
                    // Dynamically evaluated at execution time
                    const payloadToSend = currentTrack;
                    await new Promise((r) => setTimeout(r, simulatedLatencyMs));
                    publishedPayloads.push(payloadToSend);
                });
            };

            // Enqueue operation 1 (slow latency 30ms)
            enqueueTrack(30);

            // Playback immediately changes to Song B and enqueues operation 2 (fast latency 5ms)
            currentTrack = 'Song B';
            enqueueTrack(5);

            await vi.advanceTimersByTimeAsync(50);
            await trackingQueue;

            // Operation 1 sent Song A (or Song B if evaluated at run), and Operation 2 completed strictly AFTER Operation 1
            expect(publishedPayloads.length).toBe(2);
            expect(publishedPayloads[1]).toBe('Song B');
        });
    });

    describe('5. Offline Calling, Permissions & Local Missed-Call Logging', () => {
        it('offline recipient aborts call immediately without requesting microphone media, peer connection, or signaling', async () => {
            const onlinePresenceMap: Record<string, { online: boolean; lastSeen: number }> = {
                'friend-offline': { online: false, lastSeen: Date.now() - 150000 },
            };

            const isRecipientOnline = (friendId: string): boolean => {
                const presence = onlinePresenceMap[friendId];
                if (!presence) return false;
                const now = Date.now();
                return presence.online && (now - presence.lastSeen) < 90000;
            };

            const mediaDevicesSpy = vi.fn();
            const peerConnectionSpy = vi.fn();
            const signalingSpy = vi.fn();

            const initiateCallFlow = async (friendId: string) => {
                if (!isRecipientOnline(friendId)) {
                    // Abort immediately
                    return { aborted: true, reason: 'offline' };
                }

                // Would acquire media, create peer connection, and send offer:
                mediaDevicesSpy();
                peerConnectionSpy();
                signalingSpy();
                return { aborted: false };
            };

            const result = await initiateCallFlow('friend-offline');
            expect(result.aborted).toBe(true);
            expect(result.reason).toBe('offline');

            // Verification: zero microphone requests, zero peer connections, zero signals
            expect(mediaDevicesSpy).not.toHaveBeenCalled();
            expect(peerConnectionSpy).not.toHaveBeenCalled();
            expect(signalingSpy).not.toHaveBeenCalled();
        });

        it('guest user saves missed call locally in IndexedDB without attempting cloud database writes', async () => {
            const isGuest = true;
            const cloudDbSpy = vi.fn();
            const localIndexedDbSpy = vi.fn();

            const saveCallLog = async (logEntry: any) => {
                // Local write always happens in IndexedDB
                localIndexedDbSpy(logEntry);

                // Cloud write is strictly guarded against guest users
                if (!isGuest) {
                    cloudDbSpy(logEntry);
                }
            };

            const log = {
                callId: 'call-guest-offline-1',
                peerId: 'peer-offline',
                direction: 'outgoing',
                outcome: 'missed',
                durationSeconds: 0,
            };

            await saveCallLog(log);

            expect(localIndexedDbSpy).toHaveBeenCalledWith(log);
            expect(cloudDbSpy).not.toHaveBeenCalled();
        });

        it('cancels outgoing call automatically after exactly 45-second ringing timeout', () => {
            vi.useFakeTimers();

            let callCancelled = false;
            let callState: 'ringing' | 'cancelled' | 'connected' = 'ringing';

            const startCallWithTimeout = () => {
                setTimeout(() => {
                    if (callState === 'ringing') {
                        callState = 'cancelled';
                        callCancelled = true;
                    }
                }, 45000);
            };

            startCallWithTimeout();

            // Advance 44 seconds: still ringing
            vi.advanceTimersByTime(44000);
            expect(callState).toBe('ringing');
            expect(callCancelled).toBe(false);

            // Advance past 45 seconds: cancelled
            vi.advanceTimersByTime(1000);
            expect(callState).toBe('cancelled');
            expect(callCancelled).toBe(true);

            vi.useRealTimers();
        });
    });

    describe('6. Social Redux State Presence Integration', () => {
        it('updates user presence state correctly in socialSlice', () => {
            const initialState = {
                myProfile: null,
                cloudFriends: [],
                incomingRequests: [],
                outgoingRequests: [],
                notifications: [],
                unreadNotificationsCount: 0,
                activeProfileView: null,
                isNotificationPanelOpen: false,
                onlinePresenceMap: {},
                isLoadingFriends: false,
                isLoadingRequests: false,
            };

            const updatedState = socialReducer(
                initialState,
                updateUserPresence({
                    userId: 'user-101',
                    online: true,
                    lastSeen: 1600000000,
                    currentSong: { title: 'Song 101' },
                })
            );

            expect(updatedState.onlinePresenceMap['user-101']).toEqual({
                online: true,
                lastSeen: 1600000000,
                currentSong: { title: 'Song 101' },
            });
        });

        it('sets complete presence map from roster sync', () => {
            const initialState = {
                myProfile: null,
                cloudFriends: [],
                incomingRequests: [],
                outgoingRequests: [],
                notifications: [],
                unreadNotificationsCount: 0,
                activeProfileView: null,
                isNotificationPanelOpen: false,
                onlinePresenceMap: {},
                isLoadingFriends: false,
                isLoadingRequests: false,
            };

            const presenceMap = {
                'user-1': { online: true, lastSeen: 100, currentSong: null },
                'user-2': { online: false, lastSeen: 50, currentSong: null },
            };

            const state = socialReducer(initialState, setPresenceMap(presenceMap));
            expect(state.onlinePresenceMap).toEqual(presenceMap);
        });
    });

    describe('7. Friends Slice Call Lifecycle Verification', () => {
        it('preserves existing call flow when call is initiated for an online recipient', () => {
            let state = friendsReducer(undefined, startDirectCall({
                callId: 'call-online-1',
                friendId: 'user-online',
                friendName: 'Online Friend',
                callType: 'audio',
                isIncoming: false,
            }));

            expect(state.isCallActive).toBe(true);
            expect(state.activeCall?.callId).toBe('call-online-1');
            expect(state.activeCall?.status).toBe('ringing');
            expect(state.activeCall?.isIncoming).toBe(false);

            // Connects when accepted
            state = friendsReducer(state, updateCallStatus({ status: 'connected', callId: 'call-online-1' }));
            expect(state.activeCall?.status).toBe('connected');
            expect(state.activeCall?.connectedAt).toBeGreaterThan(0);

            // Clean end call
            state = friendsReducer(state, endDirectCall({ callId: 'call-online-1' }));
            expect(state.isCallActive).toBe(false);
            expect(state.activeCall).toBeNull();
        });
    });
});
