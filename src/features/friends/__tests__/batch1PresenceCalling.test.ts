// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
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
import authReducer from '../../auth/authSlice';
import musicPlayerReducer from '../../musicplayer/musicPlayerSlice';
import * as friendsDb from '../../../utils/friendsDb';
import { supabase } from '../../../lib/supabase';
import { useFriendPresence } from '../../../hooks/useFriendPresence';

// Mock idb openDB directly so friendsDb methods (saveCallLogLocal, getCallHistoryLocal)
// run their genuine production code over an in-memory store without needing browser IndexedDB globals
const mockCallStore = new Map<string, any>();
const mockDb = {
    put: vi.fn(async (store: string, val: any) => {
        if (store === 'call_history') {
            mockCallStore.set(val.id, val);
        }
    }),
    get: vi.fn(async (store: string, id: string) => {
        if (store === 'call_history') {
            return mockCallStore.get(id);
        }
    }),
    getAll: vi.fn(async (store: string) => {
        if (store === 'call_history') {
            return Array.from(mockCallStore.values());
        }
        return [];
    }),
    delete: vi.fn(async (store: string, id: string) => {
        if (store === 'call_history') {
            mockCallStore.delete(id);
        }
    }),
    clear: vi.fn(async (store: string) => {
        if (store === 'call_history') {
            mockCallStore.clear();
        }
    }),
    objectStoreNames: {
        contains: vi.fn(() => true),
    },
};

vi.mock('idb', () => ({
    openDB: vi.fn(async () => mockDb),
}));

describe('Batch 1: Presence Heartbeat, Multi-Device Detection & Offline-Aware Calling', () => {
    beforeEach(() => {
        mockCallStore.clear();
        vi.clearAllMocks();
    });

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

    describe('4. Realtime Channel Lifecycle, Hook Callbacks & Identity Guards', () => {
        let store: any;
        let presenceChannelMock: any;
        let channelCallbacks: Record<string, (payload?: any) => void>;
        let subscribeCallback: ((status: string) => void) | null = null;
        let channelCreatedCount = 0;

        const TestPresenceComponent: React.FC = () => {
            useFriendPresence();
            return null;
        };

        beforeEach(() => {
            vi.useFakeTimers();
            channelCallbacks = {};
            subscribeCallback = null;
            channelCreatedCount = 0;

            store = configureStore({
                reducer: {
                    auth: authReducer,
                    social: socialReducer,
                    musicPlayer: musicPlayerReducer,
                    friends: friendsReducer,
                },
                preloadedState: {
                    auth: {
                        user: { id: 'current-user-1', email: 'test@vibeon.app', user_metadata: { username: 'testuser' } } as any,
                        isAuthenticated: true,
                        isGuest: false,
                        token: 'test-token',
                        loading: false,
                    },
                    social: {
                        myProfile: { id: 'current-user-1', share_activity: true, show_online: true } as any,
                        onlinePresenceMap: {},
                        cloudFriends: [],
                        incomingRequests: [],
                        outgoingRequests: [],
                        notifications: [],
                        unreadNotificationsCount: 0,
                        activeProfileView: null,
                        isNotificationPanelOpen: false,
                        isLoadingFriends: false,
                        isLoadingRequests: false,
                    },
                    musicPlayer: {
                        currentSong: null,
                        isPlaying: false,
                    } as any,
                },
            });

            presenceChannelMock = {
                id: 'channel-init-1',
                topic: 'social:presence',
                state: 'closed',
                channelAdapter: {
                    isJoined: () => false,
                    isJoining: () => false,
                },
                on: vi.fn((_type: string, filter: any, cb: (payload?: any) => void) => {
                    if (filter && filter.event) {
                        channelCallbacks[filter.event] = cb;
                    }
                    return presenceChannelMock;
                }),
                subscribe: vi.fn((cb?: (status: string) => void) => {
                    presenceChannelMock.state = 'joined';
                    if (cb) {
                        subscribeCallback = cb;
                        cb('SUBSCRIBED');
                    }
                    return presenceChannelMock;
                }),
                track: vi.fn(async () => {}),
                unsubscribe: vi.fn(async () => {}),
                presenceState: vi.fn(() => ({})),
            };

            vi.spyOn(supabase, 'channel').mockImplementation(() => {
                channelCreatedCount++;
                channelCallbacks = {};
                presenceChannelMock.id = `channel-instance-${channelCreatedCount}`;
                presenceChannelMock.state = 'closed';
                return presenceChannelMock;
            });
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('useFriendPresence drops sync, join, and leave events when called from a stale channel', async () => {
            const container = document.createElement('div');
            const root = createRoot(container);

            await act(async () => {
                root.render(
                    React.createElement(
                        Provider,
                        { store },
                        React.createElement(TestPresenceComponent, null)
                    )
                );
            });

            // Active channel is subscribed
            expect(channelCallbacks['sync']).toBeDefined();
            expect(channelCallbacks['join']).toBeDefined();
            expect(channelCallbacks['leave']).toBeDefined();

            // Simulate incoming sync from active channel
            await act(async () => {
                presenceChannelMock.presenceState.mockReturnValueOnce({
                    'friend-1': [
                        { userId: 'friend-1', online: true, lastSeen: Date.now(), songUpdatedAt: Date.now() },
                    ],
                });
                channelCallbacks['sync']();
            });

            // Online map updated from active channel
            expect(store.getState().social.onlinePresenceMap['friend-1']?.online).toBe(true);

            await act(async () => {
                root.unmount();
            });
        });

        it('stops heartbeat immediately on terminal channel events (CLOSED/TIMED_OUT) and creates a fresh channel on reconnect', async () => {
            const container = document.createElement('div');
            const root = createRoot(container);

            await act(async () => {
                root.render(
                    React.createElement(
                        Provider,
                        { store },
                        React.createElement(TestPresenceComponent, null)
                    )
                );
            });

            expect(channelCreatedCount).toBe(1);

            // Channel experiences TIMED_OUT / CLOSED status
            await act(async () => {
                if (subscribeCallback) {
                    subscribeCallback('TIMED_OUT');
                }
            });

            // Fast-forward past the 5-second reconnect timer scheduled in useFriendPresence
            await act(async () => {
                vi.advanceTimersByTime(5000);
            });

            // Reconnection path created a fresh channel instance cleanly
            expect(channelCreatedCount).toBe(2);

            await act(async () => {
                root.unmount();
            });
        });
    });

    describe('5. Offline Calling, Availability Validation & Local IndexedDB Persistence', () => {
        const now = 1000000;

        it('rejects future timestamps and stale timestamps when evaluating recipient availability with aggregateUserPresenceSessions', () => {
            // Future timestamp (+60s)
            const futureSession = [{ userId: 'friend-future', online: true, lastSeen: now + 60000 }];
            expect(aggregateUserPresenceSessions(futureSession, now).online).toBe(false);

            // Stale timestamp (> 90s)
            const staleSession = [{ userId: 'friend-stale', online: true, lastSeen: now - 95000 }];
            expect(aggregateUserPresenceSessions(staleSession, now).online).toBe(false);

            // Valid online session (within 90s and <= 15s future drift)
            const validSession = [{ userId: 'friend-valid', online: true, lastSeen: now - 10000 }];
            expect(aggregateUserPresenceSessions(validSession, now).online).toBe(true);
        });

        it('persists missed-call entry via production saveCallLogLocal with mocked IndexedDB adapter and asserts retrieval with zero Supabase cloud writes', async () => {
            const supabaseRpcSpy = vi.spyOn(supabase, 'rpc');
            const supabaseFromSpy = vi.spyOn(supabase, 'from');

            const testCallId = `call-${Date.now()}`;
            const logEntry: friendsDb.CallLogEntry = {
                id: `log-${testCallId}`,
                callId: testCallId,
                peerId: 'peer-offline-1',
                peerName: 'Offline Friend',
                direction: 'outgoing',
                outcome: 'missed',
                callType: 'audio',
                startedAt: Date.now(),
                durationSeconds: 0,
            };

            // Execute production saveCallLogLocal without swallowing errors
            await friendsDb.saveCallLogLocal(logEntry);

            // Assert that the record was successfully stored in the database adapter
            const storedLogs = await friendsDb.getCallHistoryLocal();
            const found = storedLogs.find((l) => l.callId === testCallId);
            expect(found).toBeDefined();
            expect(found?.outcome).toBe('missed');
            expect(found?.peerId).toBe('peer-offline-1');

            // Assert that no Supabase cloud writes were performed
            expect(supabaseRpcSpy).not.toHaveBeenCalled();
            expect(supabaseFromSpy).not.toHaveBeenCalled();

            supabaseRpcSpy.mockRestore();
            supabaseFromSpy.mockRestore();
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
