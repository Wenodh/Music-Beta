import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppDispatch, useAppSelector } from './redux';
import { setPresenceMap, updateUserPresence } from '../features/social/socialSlice';
import { RealtimeChannel } from '@supabase/supabase-js';

const PRESENCE_CHANNEL_NAME = 'social:presence';

export const useFriendPresence = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);
    const { myProfile } = useAppSelector((state) => state.social);

    const channelRef = useRef<RealtimeChannel | null>(null);
    const lastBroadcastTrackRef = useRef<string | null>(null);
    const lastBroadcastPlayStateRef = useRef<boolean | null>(null);

    // Subscribe to global social presence channel
    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();
                const newPresenceMap: Record<string, { online: boolean; lastSeen: number; currentSong?: any }> = {};

                for (const userId in presenceState) {
                    const presences = presenceState[userId] as any[];
                    if (presences && presences.length > 0) {
                        // Select the latest presence entry among active tabs/devices
                        const latest = presences[presences.length - 1];
                        newPresenceMap[userId] = {
                            online: Boolean(latest.online),
                            lastSeen: latest.lastSeen || Date.now(),
                            currentSong: latest.currentSong || null,
                        };
                    }
                }

                dispatch(setPresenceMap(newPresenceMap));
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                if (newPresences && newPresences.length > 0) {
                    const latest = newPresences[newPresences.length - 1] as any;
                    dispatch(
                        updateUserPresence({
                            userId: key,
                            online: true,
                            lastSeen: latest.lastSeen || Date.now(),
                            currentSong: latest.currentSong || null,
                        })
                    );
                }
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                const presenceState = channel.presenceState();
                const remaining = presenceState[key];
                if (!remaining || remaining.length === 0) {
                    const lastLeft = (leftPresences && leftPresences[0]) as any;
                    dispatch(
                        updateUserPresence({
                            userId: key,
                            online: false,
                            lastSeen: lastLeft?.lastSeen || Date.now(),
                            currentSong: undefined,
                        })
                    );
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track initial presence respecting privacy preferences
                    const showOnline = myProfile?.show_online ?? true;
                    const shareActivity = myProfile?.share_activity ?? true;

                    const presencePayload: any = {
                        userId: user.id,
                        online: showOnline,
                        lastSeen: Date.now(),
                    };

                    if (shareActivity && currentSong) {
                        presencePayload.currentSong = {
                            id: currentSong.id,
                            title: currentSong.name || currentSong.title,
                            artist: currentSong.primaryArtists || currentSong.artist,
                            artworkUrl: (typeof currentSong.image === 'string' ? currentSong.image : currentSong.image?.[0]?.link) || '',
                            isPlaying,
                            updatedAt: Date.now(),
                        };
                    }

                    await channel.track(presencePayload);
                }
            });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [isAuthenticated, user?.id, dispatch, myProfile?.show_online, myProfile?.share_activity]);

    // Update tracked presence on playback transitions only (track change or play/pause toggle)
    // NEVER tracks seek position or writes to PostgreSQL
    useEffect(() => {
        if (!channelRef.current || !isAuthenticated || !user?.id) return;

        const shareActivity = myProfile?.share_activity ?? true;
        const showOnline = myProfile?.show_online ?? true;

        const trackId = currentSong?.id || null;
        const playState = isPlaying;

        // Skip redundant broadcasts if track and playing state haven't changed
        if (
            lastBroadcastTrackRef.current === trackId &&
            lastBroadcastPlayStateRef.current === playState
        ) {
            return;
        }

        lastBroadcastTrackRef.current = trackId;
        lastBroadcastPlayStateRef.current = playState;

        const presencePayload: any = {
            userId: user.id,
            online: showOnline,
            lastSeen: Date.now(),
        };

        if (shareActivity && currentSong) {
            presencePayload.currentSong = {
                id: currentSong.id,
                title: currentSong.name || currentSong.title,
                artist: currentSong.primaryArtists || currentSong.artist,
                artworkUrl: (typeof currentSong.image === 'string' ? currentSong.image : currentSong.image?.[0]?.link) || '',
                isPlaying,
                updatedAt: Date.now(),
            };
        } else {
            presencePayload.currentSong = null;
        }

        channelRef.current.track(presencePayload).catch((e) => {
            console.warn('[useFriendPresence] track update error:', e);
        });
    }, [currentSong?.id, isPlaying, isAuthenticated, user?.id, myProfile?.share_activity, myProfile?.show_online]);
};
