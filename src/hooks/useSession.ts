import { useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    setParticipants,
    addReaction,
    removeReaction,
    addMessage,
    leaveSession,
    setIsCallActive,
    setIsMuted,
    setConnectionStatus,
    setIsSyncing,
    setSessionError,
    addOrUpdatePublicParty,
    removePublicParty,
    setPublicParties
} from '../features/session/sessionSlice';
import { partyService } from '../services/partyService';
import {
    playMusic,
    pauseMusic,
    setSongs
} from '../features/musicplayer/musicPlayerSlice';

export const useSession = () => {
    const dispatch = useAppDispatch();
    const { roomCode, partyName, isPublic, isHost, isJoined, isCallActive, isMuted, participants } = useAppSelector(state => state.session);
    const { currentSong, isPlaying, currentTime, songs } = useAppSelector(state => state.musicPlayer);
    const { user } = useAppSelector(state => state.auth);
    const anonymousId = useRef(`anon-${Math.random().toString(36).substring(2, 9)}`).current;
    const userId = user?.id || anonymousId;

    const channelRef = useRef<RealtimeChannel | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

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

    // Host broadcast of party updates to discovery lobby
    useEffect(() => {
        if (!isHost || !isJoined || !roomCode || !isPublic) return;

        const broadcastParty = () => {
            partyService.broadcastPartyUpdate({
                roomCode,
                partyName: partyName || 'Listening Party',
                hostName: user?.user_metadata?.full_name || 'Host',
                hostAvatar: user?.user_metadata?.avatar_url,
                songTitle: currentSong?.name,
                songArtist: currentSong?.artist,
                songArtwork: currentSong?.image?.[currentSong.image.length - 1]?.link || currentSong?.image?.[0]?.link,
                participantCount: Math.max(1, participants.length),
                isPublic: true,
                updatedAt: Date.now()
            });
        };

        broadcastParty();
        const interval = setInterval(broadcastParty, 15000);
        return () => clearInterval(interval);
    }, [isHost, isJoined, roomCode, isPublic, partyName, user, currentSong, participants.length]);

    // Listen on lobby channel for public parties when browsing
    useEffect(() => {
        const lobbyChannel = supabase.channel('room:lobby');

        // Fetch initial list
        partyService.fetchPublicParties().then(parties => {
            if (parties.length > 0) {
                dispatch(setPublicParties(parties));
            }
        });

        lobbyChannel
            .on('broadcast', { event: 'party_update' }, ({ payload }) => {
                dispatch(addOrUpdatePublicParty(payload));
            })
            .on('broadcast', { event: 'party_ended' }, ({ payload }) => {
                dispatch(removePublicParty(payload.roomCode));
            })
            .subscribe();

        return () => {
            lobbyChannel.unsubscribe();
        };
    }, [dispatch]);

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

    const sendMessage = useCallback((text: string) => {
        if (!channelRef.current || !isJoined || !text.trim()) return;

        const msg = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            userId,
            userName: user?.user_metadata?.full_name || 'Guest',
            avatar: user?.user_metadata?.avatar_url,
            text: text.trim(),
            timestamp: Date.now()
        };

        dispatch(addMessage(msg));

        channelRef.current.send({
            type: 'broadcast',
            event: 'chat',
            payload: msg
        });
    }, [isJoined, userId, user, dispatch]);

    const sendReaction = useCallback((emoji: string) => {
        if (!channelRef.current || !isJoined) return;

        const reaction = {
            emoji,
            userId: userId,
            userName: user?.user_metadata?.full_name || 'Guest',
            id: Date.now().toString() + Math.random().toString(36).substring(7)
        };

        // Dispatch locally for immediate feedback
        dispatch(addReaction(reaction));
        setTimeout(() => {
            dispatch(removeReaction(reaction.id));
        }, 5000);

        channelRef.current.send({
            type: 'broadcast',
            event: 'reaction',
            payload: reaction
        });
    }, [isJoined, userId, user, dispatch]);

    const createPeerConnection = useCallback((peerId: string) => {
        if (peerConnectionsRef.current.has(peerId)) {
            return peerConnectionsRef.current.get(peerId)!;
        }

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: {
                        targetId: peerId,
                        senderId: userId,
                        signalType: 'ice-candidate',
                        candidate: event.candidate
                    }
                });
            }
        };

        pc.ontrack = (event) => {
            const remoteAudio = new Audio();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => console.warn('Remote audio autoplay prevented:', e));
        };

        peerConnectionsRef.current.set(peerId, pc);
        return pc;
    }, [userId]);

    const toggleCall = useCallback(async () => {
        if (isCallActive) {
            // Stop Call
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            dispatch(setIsCallActive(false));
            dispatch(setIsMuted(false));
        } else {
            // Start Call
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                localStreamRef.current = stream;
                dispatch(setIsCallActive(true));
                dispatch(setIsMuted(false));

                // Send offer to other joined participants
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: {
                            senderId: userId,
                            signalType: 'call-joined'
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to get user microphone stream:', err);
                dispatch(setSessionError('Microphone permission rejected or unavailable.'));
            }
        }
    }, [isCallActive, userId, dispatch]);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                dispatch(setIsMuted(!audioTrack.enabled));
            }
        }
    }, [dispatch]);

    useEffect(() => {
        const cleanupExistingChannel = async () => {
            if (channelRef.current) {
                const prev = channelRef.current;
                channelRef.current = null;
                try {
                    await supabase.removeChannel(prev);
                } catch (e) {
                    console.warn('Error removing channel:', e);
                }
            }
            // Remove any existing registered channel with the same topic
            if (roomCode) {
                const topic = `realtime:room:${roomCode}`;
                const existing = supabase.getChannels().find(c => c.topic === topic);
                if (existing) {
                    try {
                        await supabase.removeChannel(existing);
                    } catch (e) {
                        console.warn('Error removing existing topic channel:', e);
                    }
                }
            }
        };

        if (!isJoined || !roomCode) {
            cleanupExistingChannel();
            return;
        }

        let isCancelled = false;

        // Clean up any previously registered channel with this topic and ensure it is unmounted from Supabase client list
        const topicPrefix = `realtime:room:${roomCode}`;
        const staleChannels = supabase.getChannels().filter(c => c.topic.startsWith(topicPrefix));
        staleChannels.forEach(c => {
            try {
                c.unsubscribe();
                supabase.removeChannel(c);
            } catch (e) {
                console.warn('Error removing stale channel:', e);
            }
        });

        // Supabase Realtime rooms MUST share the exact channel name `room:${roomCode}` so all participants connect to the same broadcast and presence room!
        const channel = supabase.channel(`room:${roomCode}`, {
            config: {
                presence: {
                    key: userId,
                },
                broadcast: {
                    self: false,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const parsedParticipants = Object.values(state).flat().map((p: any) => ({
                    id: p.id || userId,
                    name: p.name || 'User',
                    avatar: p.avatar,
                    isHost: Boolean(p.isHost)
                }));

                // Deduplicate participants by id
                const uniqueParticipants = Array.from(
                    new Map(parsedParticipants.map(p => [p.id, p])).values()
                );

                dispatch(setParticipants(uniqueParticipants));
                dispatch(setConnectionStatus('connected'));

                // If host is gone, end session (only after initial presence establishes)
                if (uniqueParticipants.length > 0) {
                    const hostExists = uniqueParticipants.some(p => p.isHost);
                    if (!hostExists && !isHostRef.current) {
                        dispatch(leaveSession());
                        dispatch(setSessionError('Host has ended the session.'));
                    }
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
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                if (payload.userId === userId) return;
                dispatch(addMessage(payload));
            })
            .on('broadcast', { event: 'reaction' }, ({ payload }) => {
                // If we are the sender, we already dispatched locally
                if (payload.userId === userId) return;

                dispatch(addReaction(payload));
                setTimeout(() => {
                    dispatch(removeReaction(payload.id));
                }, 5000);
            })
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                if (payload.senderId === userId) return;

                const { senderId, targetId, signalType, sdp, candidate } = payload;

                if (signalType === 'call-joined' && localStreamRef.current) {
                    const pc = createPeerConnection(senderId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    channel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: {
                            targetId: senderId,
                            senderId: userId,
                            signalType: 'offer',
                            sdp: offer
                        }
                    });
                } else if (targetId === userId) {
                    if (signalType === 'offer') {
                        const pc = createPeerConnection(senderId);
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        channel.send({
                            type: 'broadcast',
                            event: 'signal',
                            payload: {
                                targetId: senderId,
                                senderId: userId,
                                signalType: 'answer',
                                sdp: answer
                            }
                        });
                    } else if (signalType === 'answer') {
                        const pc = peerConnectionsRef.current.get(senderId);
                        if (pc) {
                            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        }
                    } else if (signalType === 'ice-candidate') {
                        const pc = peerConnectionsRef.current.get(senderId);
                        if (pc && candidate) {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                    }
                }
            })
            .subscribe(async (status, err) => {
                if (status === 'SUBSCRIBED') {
                    if (isCancelled) return;
                    dispatch(setConnectionStatus('connected'));
                    try {
                        await channel.track({
                            id: userId,
                            name: user?.user_metadata?.full_name || (isHost ? 'Host' : 'Guest'),
                            avatar: user?.user_metadata?.avatar_url,
                            isHost: isHost,
                            joinedAt: new Date().toISOString()
                        });
                    } catch (trackError) {
                        console.warn('Presence track error:', trackError);
                    }

                    if (!isHost) {
                        // Request initial state from host
                        dispatch(setIsSyncing(true));
                        channel.send({
                            type: 'broadcast',
                            event: 'sync',
                            payload: { type: 'requestSync', senderId: userId }
                        });
                        setTimeout(() => dispatch(setIsSyncing(false)), 2000);
                    }
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Supabase channel error:', err);
                    dispatch(setConnectionStatus('disconnected'));
                    // Register local host in participant list if host so UI never breaks
                    if (isHost) {
                        dispatch(setParticipants([{
                            id: userId,
                            name: user?.user_metadata?.full_name || 'Host',
                            avatar: user?.user_metadata?.avatar_url,
                            isHost: true,
                        }]));
                    }
                } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
                    dispatch(setConnectionStatus('connecting'));
                }
            });

        channelRef.current = channel;

        return () => {
            isCancelled = true;
            try {
                if (isHost && isPublic) {
                    partyService.broadcastPartyEnded(roomCode);
                }
                supabase.removeChannel(channel);
            } catch (e) {
                console.warn('Error removing channel on unmount:', e);
            }
        };
    }, [roomCode, isJoined, isHost, user, dispatch, isPublic]);

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

    return { broadcast, sendMessage, sendReaction, toggleCall, toggleMute, isInternalAction };
};
