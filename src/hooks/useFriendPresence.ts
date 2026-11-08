import { useEffect, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { supabase } from '../lib/supabase';
import { useAppDispatch, useAppSelector } from './redux';
import { setPresenceMap, updateUserPresence } from '../features/social/socialSlice';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    PRESENCE_HEARTBEAT_INTERVAL_MS,
    aggregateUserPresenceSessions,
} from '../utils/presenceUtils';

const PRESENCE_CHANNEL_NAME = 'social:presence';

export interface ExplicitPlaybackEvent {
    type: 'playing' | 'stopped';
    timestamp: number;
    // wasSharingWhenStopped is true if playback genuinely stopped while shareActivity was true
    wasSharingWhenStopped?: boolean;
}

export const useFriendPresence = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);
    const { myProfile } = useAppSelector((state) => state.social);

    const channelRef = useRef<RealtimeChannel | null>(null);
    const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isChannelJoinedRef = useRef<boolean>(false);
    const isSubscribedProcessingRef = useRef<boolean>(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Serialized Promise Queue:
    // Ensures all asynchronous presence tracking operations execute sequentially on the active channel.
    // Chained with .catch(() => undefined) so rejected promises never stall the queue.
    const trackingQueueRef = useRef<Promise<void>>(Promise.resolve());

    // Explicit playback event tracker
    // Initialized to null on clean mount (idle device that has not experienced any playback event)
    const latestPlaybackEventRef = useRef<ExplicitPlaybackEvent | null>(null);

    // Track previously broadcast media metadata snapshot to detect same-track metadata changes
    // without redundant broadcasts caused by unstable object references
    const lastBroadcastMetadataRef = useRef<string | null>(null);

    // Refs for playback & profile state to read synchronously inside callbacks
    const currentSongRef = useRef(currentSong);
    currentSongRef.current = currentSong;

    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    const myProfileRef = useRef(myProfile);
    myProfileRef.current = myProfile;

    // Track app foreground/active state (Capacitor & Web visibility)
    const isAppActiveRef = useRef<boolean>(true);

    /**
     * Stable payload builder:
     * - Heartbeats and state syncs call this function.
     * - Only includes songUpdatedAt if an explicit playback event exists.
     * - Only includes playbackStopped: true if:
     *     1. An explicit playback event of type 'stopped' exists.
     *     2. That stop genuinely occurred while activity sharing was enabled (wasSharingWhenStopped === true).
     *     3. Activity sharing is currently enabled.
     *     4. There is no active song (Boolean(song?.id) === false). A paused song with a valid ID is NEVER mistaken for a stopped song.
     * - Disabling sharing, or a song ending while sharing is disabled, NEVER manufactures playbackStopped.
     * - Re-enabling sharing while idle after a song ended in private NEVER manufactures playbackStopped.
     */
    const getPresencePayload = useCallback(() => {
        if (!user?.id) return null;

        const profile = myProfileRef.current;
        const showOnline = profile?.show_online ?? true;
        const shareActivity = profile?.share_activity ?? true;
        const isAppActive = isAppActiveRef.current;
        const song = currentSongRef.current;
        const playing = isPlayingRef.current;
        const latestEvent = latestPlaybackEventRef.current;
        const hasSong = Boolean(song?.id);

        // If user disabled online visibility or app is backgrounded/inactive without active music,
        // broadcast online: false
        const isUserOnline = showOnline && (isAppActive || (playing && hasSong));

        const payload: any = {
            userId: user.id,
            online: isUserOnline,
            lastSeen: Date.now(),
        };

        if (shareActivity && hasSong && song) {
            // Active song broadcast (both playing and paused states)
            const songTs = latestEvent?.timestamp || Date.now();
            payload.songUpdatedAt = songTs;
            payload.currentSong = {
                id: song.id,
                title: song.name || song.title,
                artist: song.primaryArtists || song.artist,
                artworkUrl: (typeof song.image === 'string' ? song.image : song.image?.[0]?.link) || '',
                isPlaying: playing,
                updatedAt: songTs,
            };
        } else if (
            shareActivity &&
            !hasSong &&
            latestEvent?.type === 'stopped' &&
            latestEvent.wasSharingWhenStopped === true
        ) {
            // Explicit playback stop: occurred while shareActivity was enabled
            payload.songUpdatedAt = latestEvent.timestamp;
            payload.playbackStopped = true;
            payload.currentSong = null;
        } else {
            // Idle device mount, activity sharing disabled for privacy,
            // or song stopped while activity sharing was disabled:
            // Publishes currentSong: null WITHOUT playbackStopped and WITHOUT songUpdatedAt.
            payload.currentSong = null;
        }

        return payload;
    }, [user?.id]);

    /**
     * Serialized channel tracking helper using an active Promise queue.
     *
     * Invariants guaranteed:
     * 1. Execution is strictly sequential: track operations do not interleave or race.
     * 2. Rejection hardening: chained with .catch(() => undefined) so rejected track calls
     *    never stall subsequent operations.
     * 3. Fresh payload generation: getPresencePayload() is evaluated dynamically at execution time
     *    right before dispatching to the channel, eliminating obsolete snapshot publishing.
     * 4. Terminal state abort: if channel becomes terminal or unmounted, pending queued tasks abort cleanly.
     */
    const enqueueTrackPresence = useCallback((channel: RealtimeChannel): Promise<void> => {
        const nextPromise = trackingQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                // Verify channel is still valid, joined, and matches current active channel instance
                if (
                    !channel ||
                    channel.state !== 'joined' ||
                    !isChannelJoinedRef.current ||
                    channelRef.current !== channel
                ) {
                    return;
                }

                const payload = getPresencePayload();
                if (!payload) return;

                try {
                    await channel.track(payload);
                } catch (err) {
                    console.warn('[useFriendPresence] Sequential track error:', err);
                }
            })
            .catch((err) => {
                console.warn('[useFriendPresence] Queue execution failure:', err);
            });

        trackingQueueRef.current = nextPromise;
        return nextPromise;
    }, [getPresencePayload]);

    // Clear heartbeat timer safely
    const stopHeartbeat = useCallback(() => {
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
    }, []);

    // Clear reconnect timer safely
    const stopReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // Heartbeat tracking in-flight guard to prevent overlapping calls
    const isHeartbeatInFlightRef = useRef(false);

    // Start 30-second autonomous heartbeat
    const startHeartbeat = useCallback((channel: RealtimeChannel) => {
        stopHeartbeat();

        heartbeatTimerRef.current = setInterval(async () => {
            if (!channel) return;
            // Channel must be joined and must match current active channel
            if (channel.state !== 'joined' || !isChannelJoinedRef.current || channelRef.current !== channel) {
                return;
            }

            if (isHeartbeatInFlightRef.current) return;
            isHeartbeatInFlightRef.current = true;

            try {
                await enqueueTrackPresence(channel);
            } catch (err) {
                console.warn('[useFriendPresence] Heartbeat track error:', err);
            } finally {
                isHeartbeatInFlightRef.current = false;
            }
        }, PRESENCE_HEARTBEAT_INTERVAL_MS);
    }, [stopHeartbeat, enqueueTrackPresence]);

    // Re-aggregate and dispatch entire presence state from channel roster
    const syncPresenceRoster = useCallback((channel: RealtimeChannel) => {
        const presenceState = channel.presenceState();
        const newPresenceMap: Record<string, { online: boolean; lastSeen: number; currentSong?: any }> = {};
        const now = Date.now();

        for (const targetUserId in presenceState) {
            const rawSessions = presenceState[targetUserId] as any[];
            const aggregated = aggregateUserPresenceSessions(rawSessions, now);
            newPresenceMap[targetUserId] = aggregated;
        }

        dispatch(setPresenceMap(newPresenceMap));
    }, [dispatch]);

    // Periodic sweep to clean up stale entries from onlinePresenceMap
    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        const sweepInterval = setInterval(() => {
            if (channelRef.current && isChannelJoinedRef.current) {
                // Re-evaluate current channel presence state against fresh Date.now()
                syncPresenceRoster(channelRef.current);
            }
        }, PRESENCE_HEARTBEAT_INTERVAL_MS);

        return () => clearInterval(sweepInterval);
    }, [isAuthenticated, user?.id, syncPresenceRoster]);

    // Setup and manage channel subscription lifecycle
    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            stopHeartbeat();
            stopReconnect();
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            isChannelJoinedRef.current = false;
            isSubscribedProcessingRef.current = false;
            trackingQueueRef.current = Promise.resolve();
            return;
        }

        let isCancelled = false;

        const setupChannel = () => {
            if (isCancelled) return;

            // Clean up existing channel if any
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            isChannelJoinedRef.current = false;
            isSubscribedProcessingRef.current = false;
            stopHeartbeat();
            trackingQueueRef.current = Promise.resolve();

            const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    if (channelRef.current !== channel) return;
                    syncPresenceRoster(channel);
                })
                .on('presence', { event: 'join' }, ({ key }) => {
                    if (channelRef.current !== channel) return;
                    const presenceState = channel.presenceState();
                    const userSessions = (presenceState[key] || []) as any[];
                    const aggregated = aggregateUserPresenceSessions(userSessions, Date.now());

                    dispatch(
                        updateUserPresence({
                            userId: key,
                            online: aggregated.online,
                            lastSeen: aggregated.lastSeen,
                            currentSong: aggregated.currentSong,
                        })
                    );
                })
                .on('presence', { event: 'leave' }, ({ key }) => {
                    if (channelRef.current !== channel) return;
                    const presenceState = channel.presenceState();
                    const remaining = (presenceState[key] || []) as any[];
                    const aggregated = aggregateUserPresenceSessions(remaining, Date.now());

                    dispatch(
                        updateUserPresence({
                            userId: key,
                            online: aggregated.online,
                            lastSeen: aggregated.lastSeen,
                            currentSong: aggregated.currentSong,
                        })
                    );
                })
                .subscribe(async (status) => {
                    if (isCancelled) return;

                    if (status === 'SUBSCRIBED') {
                        // Prevent duplicate SUBSCRIBED processing from creating multiple heartbeat timers
                        // or duplicate initial state broadcasts
                        if (isSubscribedProcessingRef.current) {
                            return;
                        }
                        isSubscribedProcessingRef.current = true;
                        isChannelJoinedRef.current = true;

                        // Synchronize initial playback state if a song is playing upon initial subscription
                        const song = currentSongRef.current;
                        const playing = isPlayingRef.current;
                        const hasSong = Boolean(song?.id);

                        if (hasSong) {
                            if (!latestPlaybackEventRef.current) {
                                latestPlaybackEventRef.current = {
                                    type: 'playing',
                                    timestamp: Date.now(),
                                };
                            }
                        }

                        // Serialize metadata snapshot for change detection
                        const artworkUrl = (typeof song?.image === 'string' ? song.image : song?.image?.[0]?.link) || '';
                        lastBroadcastMetadataRef.current = hasSong && song
                            ? `${song.id}|${song.name || song.title}|${song.primaryArtists || song.artist}|${artworkUrl}|${playing}`
                            : null;

                        // Track initial presence via sequential Promise queue
                        await enqueueTrackPresence(channel);

                        // Race check: Verify effect is not cancelled, channelRef.current still points to this channel,
                        // and channel.state is still 'joined' before starting heartbeat
                        if (!isCancelled && channelRef.current === channel && channel.state === 'joined') {
                            startHeartbeat(channel);
                        }
                    } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                        // Immediate terminal-channel cleanup: nullify channelRef immediately to prevent
                        // stale callbacks or pending tracks from acting on the old channel during the reconnect window
                        isChannelJoinedRef.current = false;
                        isSubscribedProcessingRef.current = false;
                        stopHeartbeat();
                        if (channelRef.current === channel) {
                            channelRef.current = null;
                        }
                        try {
                            channel.unsubscribe();
                        } catch {
                            // Handled silently
                        }

                        // Reset serialized queue for this channel
                        trackingQueueRef.current = Promise.resolve();

                        // Schedule single clean reconnection attempt with fresh channel
                        stopReconnect();
                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (!isCancelled) {
                                setupChannel();
                            }
                        }, 5000);
                    }
                });

            channelRef.current = channel;
        };

        setupChannel();

        return () => {
            isCancelled = true;
            stopHeartbeat();
            stopReconnect();
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            isChannelJoinedRef.current = false;
            isSubscribedProcessingRef.current = false;
            trackingQueueRef.current = Promise.resolve();
        };
    }, [
        isAuthenticated,
        user?.id,
        dispatch,
        enqueueTrackPresence,
        startHeartbeat,
        stopHeartbeat,
        stopReconnect,
        syncPresenceRoster,
    ]);

    // App foreground / background and visibility lifecycle handling
    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        const handleVisibilityOrStateChange = async (isActive: boolean) => {
            isAppActiveRef.current = isActive;

            if (channelRef.current && isChannelJoinedRef.current && channelRef.current.state === 'joined') {
                if (isActive) {
                    // Resumed into foreground: immediately re-sync roster and broadcast fresh presence
                    syncPresenceRoster(channelRef.current);
                    enqueueTrackPresence(channelRef.current).catch((err) => {
                        console.warn('[useFriendPresence] Foreground presence track error:', err);
                    });
                } else {
                    // Backgrounded: broadcast immediately (will update online: false unless music is actively playing)
                    enqueueTrackPresence(channelRef.current).catch((err) => {
                        console.warn('[useFriendPresence] Background presence track error:', err);
                    });
                }
            }
        };

        const onVisibilityChange = () => {
            handleVisibilityOrStateChange(document.visibilityState === 'visible');
        };

        const onWindowFocus = () => handleVisibilityOrStateChange(true);
        const onWindowBlur = () => {
            if (document.visibilityState !== 'visible') {
                handleVisibilityOrStateChange(false);
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onWindowFocus);
        window.addEventListener('blur', onWindowBlur);

        let capAppHandle: any = null;
        try {
            CapApp.addListener('appStateChange', (state) => {
                handleVisibilityOrStateChange(state.isActive);
            }).then((handle) => {
                capAppHandle = handle;
            }).catch(() => {});
        } catch {
            // Not native or CapApp unavailable
        }

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onWindowFocus);
            window.removeEventListener('blur', onWindowBlur);
            if (capAppHandle && typeof capAppHandle.remove === 'function') {
                capAppHandle.remove();
            }
        };
    }, [isAuthenticated, user?.id, syncPresenceRoster, enqueueTrackPresence]);

    // Track actual playback transitions independently from privacy changes
    // Detects same-track metadata changes (title, artist, artworkUrl, isPlaying)
    // using Boolean(song?.id) consistently and avoids unnecessary broadcasts from object-reference changes
    useEffect(() => {
        if (!channelRef.current || !isAuthenticated || !user?.id) return;

        const song = currentSong;
        const playing = isPlaying;
        const profile = myProfile;
        const shareActivity = profile?.share_activity ?? true;
        const hasSong = Boolean(song?.id);

        const artworkUrl = (typeof song?.image === 'string' ? song.image : song?.image?.[0]?.link) || '';
        const metadataKey = hasSong && song
            ? `${song.id}|${song.name || song.title}|${song.primaryArtists || song.artist}|${artworkUrl}|${playing}`
            : null;

        // Skip if metadata key hasn't changed (e.g. identical track, playing state, and metadata)
        if (lastBroadcastMetadataRef.current === metadataKey) {
            return;
        }

        const hadSong = lastBroadcastMetadataRef.current !== null;
        const nowHasSong = hasSong;

        // Record explicit playback event
        if (nowHasSong) {
            // Track is active (playing or paused)
            latestPlaybackEventRef.current = {
                type: 'playing',
                timestamp: Date.now(),
            };
        } else if (hadSong && !nowHasSong) {
            // Genuine active-to-stopped playback transition (song cleared / ended)
            latestPlaybackEventRef.current = {
                type: 'stopped',
                timestamp: Date.now(),
                wasSharingWhenStopped: shareActivity,
            };
        }

        lastBroadcastMetadataRef.current = metadataKey;

        if (channelRef.current && channelRef.current.state === 'joined' && isChannelJoinedRef.current) {
            enqueueTrackPresence(channelRef.current).catch((e) => {
                console.warn('[useFriendPresence] Playback track update error:', e);
            });
        }
    }, [currentSong, isPlaying, myProfile, isAuthenticated, user?.id, enqueueTrackPresence]);

    // Privacy preference change effect:
    // Fires when share_activity or show_online changes.
    // Re-tracks presence to apply privacy filters IMMEDIATELY,
    // but NEVER updates latestPlaybackEventRef or manufactures playbackStopped.
    const lastBroadcastShareActivityRef = useRef<boolean | null>(null);
    const lastBroadcastShowOnlineRef = useRef<boolean | null>(null);

    useEffect(() => {
        if (!channelRef.current || !isAuthenticated || !user?.id) return;

        const shareActivity = myProfile?.share_activity ?? true;
        const showOnline = myProfile?.show_online ?? true;

        if (
            lastBroadcastShareActivityRef.current === shareActivity &&
            lastBroadcastShowOnlineRef.current === showOnline
        ) {
            return;
        }

        lastBroadcastShareActivityRef.current = shareActivity;
        lastBroadcastShowOnlineRef.current = showOnline;

        // Re-track with updated privacy filtering without modifying playback events
        if (channelRef.current && channelRef.current.state === 'joined' && isChannelJoinedRef.current) {
            enqueueTrackPresence(channelRef.current).catch((e) => {
                console.warn('[useFriendPresence] Privacy track update error:', e);
            });
        }
    }, [myProfile?.share_activity, myProfile?.show_online, isAuthenticated, user?.id, enqueueTrackPresence]);
};
