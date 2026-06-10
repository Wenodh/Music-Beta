import { useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    setParticipants,
    addReaction,
    removeReaction,
    leaveSession,
    setSessionError
} from '../features/session/sessionSlice';
import {
    playMusic,
    pauseMusic,
    setCurrentTime,
    setCurrentSong,
    setSongs
} from '../features/musicplayer/musicPlayerSlice';
import { Song } from '../types/music';

export const useSession = () => {
    const dispatch = useAppDispatch();
    const { roomCode, isHost, isJoined } = useAppSelector(state => state.session);
    const { currentSong, isPlaying, currentTime, songs } = useAppSelector(state => state.musicPlayer);
    const { user } = useAppSelector(state => state.auth);
    const anonymousId = useRef(`anon-${Math.random().toString(36).substring(2, 9)}`).current;
    const userId = user?.id || anonymousId;

    const channelRef = useRef<RealtimeChannel | null>(null);
    const lastEventRef = useRef<{ type: string; timestamp: number; songId?: string } | null>(null);

    const isInternalAction = useRef(false);

    // Use refs for fresh values in listeners
    const isPlayingRef = useRef(isPlaying);
    const currentSongRef = useRef(currentSong);
    const currentTimeRef = useRef(currentTime);
    const songsRef = useRef(songs);
    const isHostRef = useRef(isHost);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { songsRef.current = songs; }, [songs]);
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);

    const broadcast = useCallback((type: string, payload: any) => {
        if (!channelRef.current || !isJoined) return;

        // Hosts can broadcast anything, Guests can only broadcast reactions and sync requests
        if (!isHost && type !== 'requestSync' && type !== 'reaction') return;

        channelRef.current.send({
            type: 'broadcast',
            event: 'sync',
            payload: { type, ...payload, senderId: userId }
        });
    }, [isJoined, isHost, userId]);

    const sendReaction = useCallback((emoji: string) => {
        if (!channelRef.current || !isJoined) return;

        channelRef.current.send({
            type: 'broadcast',
            event: 'reaction',
            payload: {
                emoji,
                userId: userId,
                userName: user?.user_metadata?.full_name || 'Guest',
                id: Date.now().toString()
            }
        });
    }, [isJoined, userId, user]);

    useEffect(() => {
        if (!isJoined || !roomCode) {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            return;
        }

        const channel = supabase.channel(`room:${roomCode}`, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const participants = Object.values(state).flat().map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    isHost: p.isHost
                }));
                dispatch(setParticipants(participants));

                // If host is gone, end session
                const hostExists = participants.some(p => p.isHost);
                if (!hostExists && !isHost) {
                   dispatch(leaveSession());
                   dispatch(setSessionError('Host has left the session.'));
                }
            })
            .on('broadcast', { event: 'sync' }, ({ payload }) => {
                if (payload.senderId === userId) return;

                isInternalAction.current = true;

                switch (payload.type) {
                    case 'play':
                        dispatch(playMusic({ ...payload.song, forcePlay: true }));
                        break;
                    case 'pause':
                        if (isPlayingRef.current) dispatch(pauseMusic());
                        break;
                    case 'seek':
                        if (Math.abs(currentTimeRef.current - payload.time) > 3) {
                             window.dispatchEvent(new CustomEvent('session-seek', {
                                detail: { time: payload.time, songId: payload.songId }
                             }));
                        }
                        break;
                    case 'songChange':
                        dispatch(playMusic({ ...payload.song, forcePlay: true }));
                        break;
                    case 'queueUpdate':
                        dispatch(setSongs(payload.songs));
                        break;
                    case 'requestSync':
                        if (isHostRef.current) {
                            broadcast('fullSync', {
                                song: currentSongRef.current,
                                isPlaying: isPlayingRef.current,
                                time: currentTimeRef.current,
                                songs: songsRef.current,
                                targetId: payload.senderId // Only the requester should sync
                            });
                        }
                        break;
                    case 'fullSync':
                        // Only sync if we are a guest and targeted (or if we are a guest who just joined)
                        if (!isHostRef.current && (payload.targetId === userId || !payload.targetId)) {
                            if (payload.songs) dispatch(setSongs(payload.songs));
                            if (payload.song) {
                                dispatch(playMusic({ ...payload.song, forcePlay: true }));
                                if (payload.isPlaying === false) {
                                    setTimeout(() => dispatch(pauseMusic()), 50);
                                }
                            }
                            window.dispatchEvent(new CustomEvent('session-seek', {
                                detail: { time: payload.time, songId: payload.song?.id }
                            }));
                        }
                        break;
                }

                setTimeout(() => {
                    isInternalAction.current = false;
                }, 100);
            })
            .on('broadcast', { event: 'reaction' }, ({ payload }) => {
                dispatch(addReaction(payload));
                setTimeout(() => {
                    dispatch(removeReaction(payload.id));
                }, 5000);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: userId,
                        name: user?.user_metadata?.full_name || 'Guest',
                        avatar: user?.user_metadata?.avatar_url,
                        isHost: isHost,
                        joinedAt: new Date().toISOString()
                    });

                    if (!isHost) {
                        // Request initial state from host
                        channel.send({
                            type: 'broadcast',
                            event: 'sync',
                            payload: { type: 'requestSync', senderId: userId }
                        });
                    }
                }
            });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [roomCode, isJoined, isHost, user, dispatch]);

    // Periodically sync host time for drift correction
    useEffect(() => {
        if (!isHost || !isJoined) return;

        const interval = setInterval(() => {
            if (isHostRef.current && isPlayingRef.current) {
                broadcast('seek', { time: currentTimeRef.current, songId: currentSongRef.current?.id });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isHost, isJoined, broadcast]);

    return { broadcast, sendReaction, isInternalAction };
};
