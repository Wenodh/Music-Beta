import { useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { supabase } from '../lib/supabase';
import { soundService } from '../services/soundService';
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
    setPublicParties,
    setStateVersion,
    incrementStateVersion,
    setHostGracePeriod,
    setGraceSecondsRemaining,
    setTempRateMultiplier,
    setSongUnavailable,
    promoteToHost,
    setHostId
} from '../features/session/sessionSlice';
import { partyService } from '../services/partyService';
import {
    playMusic,
    pauseMusic,
    setSongs,
    setPlaybackSpeed
} from '../features/musicplayer/musicPlayerSlice';
import { musicApiService } from '../services/musicApiService';
import { mapApiSongToSong } from '../services/favoriteRecoveryService';

export const useSession = () => {
    const dispatch = useAppDispatch();
    const {
        roomCode,
        partyName,
        partyDescription,
        partyCategory,
        isPublic,
        isHost,
        hostId,
        coHostIds,
        isJoined,
        isCallActive,
        isMuted,
        participants,
        stateVersion,
        isChatMutedByHost,
        hostGracePeriodActive
    } = useAppSelector(state => state.session);

    const { currentSong, isPlaying, currentTime, songs, playbackSpeed } = useAppSelector(state => state.musicPlayer);
    const { user } = useAppSelector(state => state.auth);
    const anonymousId = useRef(`anon-${Math.random().toString(36).substring(2, 9)}`).current;
    const userId = user?.id || anonymousId;

    const channelRef = useRef<RealtimeChannel | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    const isInternalAction = useRef(false);

    // Dynamic state refs for listeners
    const isPlayingRef = useRef(isPlaying);
    const currentSongRef = useRef(currentSong);
    const currentTimeRef = useRef(currentTime);
    const songsRef = useRef(songs);
    const isHostRef = useRef(isHost);
    const hostIdRef = useRef(hostId);
    const stateVersionRef = useRef(stateVersion);
    const basePlaybackSpeedRef = useRef(playbackSpeed);
    const participantsRef = useRef(participants);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { songsRef.current = songs; }, [songs]);
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);
    useEffect(() => { hostIdRef.current = hostId; }, [hostId]);
    useEffect(() => { stateVersionRef.current = stateVersion; }, [stateVersion]);
    useEffect(() => { basePlaybackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);

    // Timer & Grace Period Refs
    const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const graceIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const tempRateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to safely restore user base playback speed
    const restoreBaseSpeed = useCallback(() => {
        if (tempRateTimeoutRef.current) {
            clearTimeout(tempRateTimeoutRef.current);
            tempRateTimeoutRef.current = null;
        }
        dispatch(setTempRateMultiplier(1.0));
        window.dispatchEvent(new CustomEvent('session-rate-adjustment', {
            detail: { rateMultiplier: 1.0, effectiveSpeed: basePlaybackSpeedRef.current }
        }));
    }, [dispatch]);

    // Clear Host Grace Period (Declared early to prevent TDZ reference errors)
    const cancelHostGracePeriod = useCallback(() => {
        if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
        }
        if (graceIntervalRef.current) {
            clearInterval(graceIntervalRef.current);
            graceIntervalRef.current = null;
        }
        dispatch(setHostGracePeriod({ active: false, remaining: 30 }));
    }, [dispatch]);

    // Host broadcast of party updates to discovery lobby
    useEffect(() => {
        if (!isHost || !isJoined || !roomCode || !isPublic) return;

        const broadcastParty = () => {
            partyService.broadcastPartyUpdate({
                roomCode,
                partyName: partyName || 'Listening Party',
                description: partyDescription,
                category: partyCategory,
                hostId: userId,
                hostName: user?.user_metadata?.full_name || 'Host',
                hostAvatar: user?.user_metadata?.avatar_url,
                songTitle: currentSong?.name,
                songArtist: currentSong?.artist,
                songArtwork: currentSong?.image?.[currentSong.image.length - 1]?.link || currentSong?.image?.[0]?.link,
                participantCount: Math.max(1, participants.length),
                isPublic: true,
                status: 'active',
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

        partyService.fetchPublicParties().then(parties => {
            if (parties.length > 0) {
                dispatch(setPublicParties(parties));
            }
        });

        lobbyChannel
            .on('broadcast', { event: 'party_update' }, ({ payload }) => {
                dispatch(addOrUpdatePublicParty(payload));
                // Play invitation/party alert sound for incoming session events
                soundService.playInvitationSound();
            })
            .on('broadcast', { event: 'party_ended' }, ({ payload }) => {
                dispatch(removePublicParty(payload.roomCode));
            })
            .subscribe();

        return () => {
            lobbyChannel.unsubscribe();
        };
    }, [dispatch]);

    // Authoritative host broadcast with monotonic state version
    const broadcast = useCallback((type: string, payload: any) => {
        if (!channelRef.current || !isJoined) return;

        // Participants can only broadcast sync requests and reactions
        if (!isHostRef.current && type !== 'requestSync' && type !== 'reaction') return;

        stateVersionRef.current += 1;
        const nextVersion = stateVersionRef.current;
        if (isHostRef.current && type !== 'requestSync' && type !== 'reaction') {
            dispatch(incrementStateVersion());
        }

        const presenceHost = participantsRef.current.find(p => p.isHost)?.id;
        const verifiedHostId = isHostRef.current ? userId : (hostIdRef.current || presenceHost);

        channelRef.current.send({
            type: 'broadcast',
            event: 'sync',
            payload: {
                type,
                ...payload,
                senderId: userId,
                hostId: verifiedHostId,
                stateVersion: nextVersion,
                serverTimestamp: Date.now()
            }
        });
    }, [isJoined, userId, dispatch]);

    // Independent Song Resolution per Participant with Fallback
    const resolveAndPlayTrack = useCallback(async (trackData: any, shouldForcePlay = true) => {
        if (!trackData) return;
        try {
            dispatch(setSongUnavailable({ unavailable: false }));

            // 1. If track already has direct audio stream URL, play immediately
            if (trackData.music || trackData.downloadUrl) {
                dispatch(playMusic({ ...trackData, forcePlay: shouldForcePlay }));
                return;
            }

            // 2. Resolve complete metadata through MusicApiService
            if (trackData.id) {
                const apiRes = await musicApiService.fetchWithFallback(`/api/songs/${trackData.id}`);
                const rawSong = apiRes?.data?.[0] || apiRes?.data || apiRes;
                if (rawSong && (rawSong.downloadUrl || rawSong.music)) {
                    const normalized = mapApiSongToSong(rawSong, trackData.id, trackData);
                    dispatch(playMusic({ ...normalized, forcePlay: shouldForcePlay }));
                    return;
                }
            }

            // Fallback: Dispatch with best available metadata
            dispatch(playMusic({ ...trackData, forcePlay: shouldForcePlay }));
        } catch (err) {
            console.warn('[useSession] Song resolution failed for participant:', err);
            dispatch(setSongUnavailable({ unavailable: true, songName: trackData.name || 'Current Song' }));
        }
    }, [dispatch]);

    // Tiered Drift Correction Algorithm
    const handleDriftCorrection = useCallback((hostTime: number, broadcastTimestamp: number, hostSpeed = 1.0, songId?: string) => {
        // Latency estimation
        const networkLag = Math.max(0, (Date.now() - broadcastTimestamp) / 1000);
        const estimatedHostTime = hostTime + (networkLag * hostSpeed);
        const drift = Math.abs(currentTimeRef.current - estimatedHostTime);

        // Tier 1: Small drift (< 1.5 seconds) - Natural jitter, do nothing
        if (drift < 1.5) {
            restoreBaseSpeed();
            return;
        }

        // Tier 2: Moderate drift (1.5s - 4.0s) - Temporary gentle rate adjustment (0.98x - 1.02x)
        if (drift >= 1.5 && drift <= 4.0) {
            // If local audio is lagging behind, accelerate slightly (1.02x)
            // If local audio is ahead, decelerate slightly (0.98x)
            const multiplier = currentTimeRef.current < estimatedHostTime ? 1.02 : 0.98;
            const effectiveSpeed = Number((basePlaybackSpeedRef.current * multiplier).toFixed(3));

            dispatch(setTempRateMultiplier(multiplier));
            window.dispatchEvent(new CustomEvent('session-rate-adjustment', {
                detail: { rateMultiplier: multiplier, effectiveSpeed }
            }));

            // Bound correction duration to max 8 seconds, then restore user base speed
            if (tempRateTimeoutRef.current) clearTimeout(tempRateTimeoutRef.current);
            tempRateTimeoutRef.current = setTimeout(() => {
                restoreBaseSpeed();
            }, 8000);
            return;
        }

        // Tier 3: Large drift (> 4.0s) - Controlled seek directly to host position
        if (drift > 4.0) {
            restoreBaseSpeed();
            window.dispatchEvent(new CustomEvent('session-seek', {
                detail: { time: estimatedHostTime, songId: songId || currentSongRef.current?.id }
            }));
        }
    }, [dispatch, restoreBaseSpeed]);

    // Host Election Procedure (Triggered upon 30s grace expiry) - Strictly Database RPC Authoritative
    const executeHostElection = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc('elect_next_room_host', {
                target_room_code: roomCode
            });

            if (!error && data?.success) {
                if (data.new_host_id) {
                    dispatch(setHostId(data.new_host_id));
                    cancelHostGracePeriod();
                    if (data.new_host_id === userId) {
                        dispatch(promoteToHost());
                        if (channelRef.current) {
                            stateVersionRef.current += 1;
                            channelRef.current.send({
                                type: 'broadcast',
                                event: 'host_elected',
                                payload: {
                                    newHostId: userId,
                                    roomCode,
                                    stateVersion: stateVersionRef.current
                                }
                            });
                        }
                    }
                    return;
                } else if (data.status === 'closed') {
                    dispatch(leaveSession());
                    dispatch(setSessionError('Listening party ended: No eligible participants remain.'));
                    return;
                }
            } else {
                console.warn('[useSession] Host election RPC pending or retry needed:', error?.message);
            }
        } catch (err) {
            console.warn('[useSession] Host election RPC execution error:', err);
        }

        // Safety Guarantee: Do NOT independently promote a participant on the client.
        // Instead, remain in reconnecting/pending state and schedule a safe retry in 5 seconds.
        if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
        graceTimerRef.current = setTimeout(() => {
            executeHostElection();
        }, 5000);
    }, [userId, roomCode, dispatch, cancelHostGracePeriod]);

    // Start 30-Second Host Grace Period
    const initiateHostGracePeriod = useCallback(() => {
        if (graceTimerRef.current) return; // Already running

        dispatch(setHostGracePeriod({ active: true, remaining: 30 }));
        let remaining = 30;

        graceIntervalRef.current = setInterval(() => {
            remaining -= 1;
            dispatch(setGraceSecondsRemaining(remaining));
            if (remaining <= 0) {
                if (graceIntervalRef.current) clearInterval(graceIntervalRef.current);
                graceIntervalRef.current = null;
            }
        }, 1000);

        graceTimerRef.current = setTimeout(() => {
            graceTimerRef.current = null;
            if (graceIntervalRef.current) {
                clearInterval(graceIntervalRef.current);
                graceIntervalRef.current = null;
            }
            executeHostElection();
        }, 30000);
    }, [dispatch, executeHostElection]);


    // Moderation Action: Kick participant from room (Server RPC Authenticated)
    const kickParticipant = useCallback(async (targetUserId: string) => {
        if (!isHostRef.current) return;
        try {
            // First execute authenticated server-side moderation RPC
            await supabase.rpc('moderate_room_participant', {
                target_room_code: roomCode,
                target_user_id: targetUserId,
                moderation_action: 'kick'
            });
        } catch (e) {
            console.warn('[useSession] Server kick moderation failed, broadcasting to room:', e);
        }

        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'moderation',
                payload: { action: 'kick', targetUserId, roomCode, senderId: userId }
            });
        }
    }, [roomCode, userId]);

    // Moderation Action: Mute / Unmute room chat (Signed with host userId)
    const toggleRoomChatMute = useCallback((muted: boolean) => {
        if (!isHostRef.current) return;
        dispatch(setChatMutedByHost(muted));
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'moderation',
                payload: { action: 'mute_chat', isMuted: muted, roomCode, senderId: userId }
            });
        }
    }, [roomCode, userId, dispatch]);

    const sendMessage = useCallback((text: string) => {
        if (!channelRef.current || !isJoined || !text.trim()) return;

        // Disallow non-host chat if host has muted room chat
        if (isChatMutedByHost && !isHostRef.current) {
            return;
        }

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
    }, [isJoined, userId, user, dispatch, isChatMutedByHost]);

    const sendReaction = useCallback((emoji: string) => {
        if (!channelRef.current || !isJoined) return;

        const reaction = {
            emoji,
            userId: userId,
            userName: user?.user_metadata?.full_name || 'Guest',
            id: Date.now().toString() + Math.random().toString(36).substring(7)
        };

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
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            dispatch(setIsCallActive(false));
            dispatch(setIsMuted(false));
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                localStreamRef.current = stream;
                dispatch(setIsCallActive(true));
                dispatch(setIsMuted(false));

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

    // Channel Subscription & Realtime Event Dispatcher
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
            restoreBaseSpeed();
            cancelHostGracePeriod();
            return;
        }

        let isCancelled = false;

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
                    isHost: Boolean(p.isHost),
                    role: p.role || (p.isHost ? 'host' : 'listener'),
                    joinedAt: p.joinedAt || new Date().toISOString()
                }));

                const uniqueParticipants = Array.from(
                    new Map(parsedParticipants.map(p => [p.id, p])).values()
                );

                dispatch(setParticipants(uniqueParticipants));
                dispatch(setConnectionStatus('connected'));

                // Detect Host Presence & Manage Grace Period
                if (uniqueParticipants.length > 0) {
                    const hostPresent = uniqueParticipants.some(p => p.isHost);
                    if (hostPresent) {
                        cancelHostGracePeriod();
                        const currentHost = uniqueParticipants.find(p => p.isHost);
                        if (currentHost && currentHost.id !== hostIdRef.current) {
                            dispatch(setHostId(currentHost.id));
                        }
                    } else if (!isHostRef.current) {
                        // Host missing - trigger 30s grace countdown before election
                        initiateHostGracePeriod();
                    }
                }
            })
            .on('broadcast', { event: 'moderation' }, ({ payload }) => {
                // Verify sender authorization: only the authenticated host can execute moderation actions!
                const presenceRoster = channelRef.current?.presenceState() || {};
                const presenceHosts = Object.values(presenceRoster).flat().filter((p: any) => p.isHost).map((p: any) => p.id);
                const authorizedHostId = hostIdRef.current || presenceHosts[0] || participantsRef.current.find(p => p.isHost)?.id;

                if (!authorizedHostId || payload.senderId !== authorizedHostId) {
                    console.warn('[useSession] Rejected unauthorized moderation broadcast from:', payload.senderId);
                    return;
                }

                if (payload.action === 'kick' && payload.targetUserId === userId) {
                    dispatch(leaveSession());
                    dispatch(setSessionError('You have been removed from this party by the host.'));
                } else if (payload.action === 'mute_chat') {
                    dispatch(setChatMutedByHost(Boolean(payload.isMuted)));
                }
            })
            .on('broadcast', { event: 'sync' }, ({ payload }) => {
                if (payload.senderId === userId) return;

                // 1. Verify message sender matches active presence host FIRST (prevent unauthorized state desync attacks)
                if (!isHostRef.current && payload.type !== 'requestSync' && payload.type !== 'reaction') {
                    // Check against actual channel presence roster state directly
                    const presenceRoster = channelRef.current?.presenceState() || {};
                    const presenceHosts = Object.values(presenceRoster).flat().filter((p: any) => p.isHost).map((p: any) => p.id);
                    const authorizedHostId = hostIdRef.current || presenceHosts[0] || participantsRef.current.find(p => p.isHost)?.id;

                    if (authorizedHostId && payload.senderId !== authorizedHostId) {
                        console.warn('[useSession] Rejected unauthorized broadcast from sender:', payload.senderId);
                        return;
                    }
                }

                // 2. Only after sender verification, reject stale state versions and update version
                if (!isHostRef.current && payload.stateVersion !== undefined) {
                    if (payload.stateVersion <= stateVersionRef.current) {
                        return; // Reject stale or out-of-order message
                    }
                    stateVersionRef.current = payload.stateVersion;
                    dispatch(setStateVersion(payload.stateVersion));
                }

                isInternalAction.current = true;

                switch (payload.type) {
                    case 'play':
                        if (payload.song) {
                            resolveAndPlayTrack(payload.song, true);
                        } else if (!isPlayingRef.current) {
                            dispatch(playMusic({ forcePlay: true }));
                        }
                        handleDriftCorrection(payload.time || 0, payload.serverTimestamp || Date.now(), payload.playbackSpeed || 1.0, payload.song?.id);
                        break;
                    case 'pause':
                        restoreBaseSpeed();
                        if (isPlayingRef.current) dispatch(pauseMusic());
                        break;
                    case 'seek':
                        handleDriftCorrection(payload.time, payload.serverTimestamp || Date.now(), payload.playbackSpeed || 1.0, payload.songId);
                        break;
                    case 'songChange':
                        restoreBaseSpeed();
                        resolveAndPlayTrack(payload.song, true);
                        break;
                    case 'queueUpdate':
                        if (payload.songs) dispatch(setSongs(payload.songs));
                        break;
                    case 'playbackSpeed':
                        if (payload.speed) {
                            dispatch(setPlaybackSpeed(payload.speed));
                        }
                        break;
                    case 'requestSync':
                        if (isHostRef.current) {
                            broadcast('fullSync', {
                                song: currentSongRef.current,
                                isPlaying: isPlayingRef.current,
                                time: currentTimeRef.current,
                                songs: songsRef.current,
                                playbackSpeed: basePlaybackSpeedRef.current,
                                targetId: payload.senderId
                            });
                        }
                        break;
                    case 'fullSync':
                        if (!isHostRef.current && (payload.targetId === userId || !payload.targetId)) {
                            if (payload.songs) dispatch(setSongs(payload.songs));
                            if (payload.playbackSpeed) dispatch(setPlaybackSpeed(payload.playbackSpeed));
                            if (payload.song) {
                                resolveAndPlayTrack(payload.song, payload.isPlaying);
                                if (payload.isPlaying === false) {
                                    setTimeout(() => dispatch(pauseMusic()), 50);
                                }
                            }
                            handleDriftCorrection(payload.time || 0, payload.serverTimestamp || Date.now(), payload.playbackSpeed || 1.0, payload.song?.id);
                        }
                        break;
                }

                setTimeout(() => {
                    isInternalAction.current = false;
                }, 100);
            })
            .on('broadcast', { event: 'host_elected' }, ({ payload }) => {
                if (payload.newHostId) {
                    dispatch(setHostId(payload.newHostId));
                    cancelHostGracePeriod();
                    if (payload.newHostId === userId) {
                        dispatch(promoteToHost());
                    }
                }
            })
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                if (payload.userId === userId) return;
                dispatch(addMessage(payload));
            })
            .on('broadcast', { event: 'reaction' }, ({ payload }) => {
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
                            role: isHost ? 'host' : 'listener',
                            joinedAt: new Date().toISOString()
                        });

                        // Maintain public.room_participants row in database if room exists
                        if (user?.id) {
                            try {
                                const { data: roomRow } = await supabase
                                    .from('listening_rooms')
                                    .select('id')
                                    .eq('room_code', roomCode)
                                    .maybeSingle();

                                if (roomRow?.id) {
                                    await supabase.from('room_participants').upsert({
                                        room_id: roomRow.id,
                                        user_id: user.id,
                                        role: isHost ? 'host' : 'listener',
                                        status: 'joined',
                                        last_ping: new Date().toISOString()
                                    }, { onConflict: 'room_id,user_id' });
                                }
                            } catch {
                                // Silent fail if table not yet migrated
                            }
                        }
                    } catch (trackError) {
                        console.warn('Presence track error:', trackError);
                    }

                    if (!isHost) {
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
                    if (isHost) {
                        dispatch(setParticipants([{
                            id: userId,
                            name: user?.user_metadata?.full_name || 'Host',
                            avatar: user?.user_metadata?.avatar_url,
                            isHost: true,
                            role: 'host'
                        }]));
                    }
                } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
                    dispatch(setConnectionStatus('connecting'));
                }
            });

        channelRef.current = channel;

        return () => {
            isCancelled = true;
            restoreBaseSpeed();
            cancelHostGracePeriod();

            // VIBE-BUG-007: Teardown WebRTC PeerConnections and MediaTracks on unmount
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => {
                    try {
                        t.stop();
                    } catch (e) {
                        console.warn('Error stopping session media track on unmount:', e);
                    }
                });
                localStreamRef.current = null;
            }

            peerConnectionsRef.current.forEach((pc) => {
                try {
                    pc.onicecandidate = null;
                    pc.ontrack = null;
                    pc.close();
                } catch (e) {
                    console.warn('Error closing session peer connection on unmount:', e);
                }
            });
            peerConnectionsRef.current.clear();

            try {
                if (isHost && isPublic) {
                    partyService.broadcastPartyEnded(roomCode);
                }
                supabase.removeChannel(channel);
            } catch (e) {
                console.warn('Error removing channel on unmount:', e);
            }
        };
    }, [
        roomCode,
        isJoined,
        isHost,
        user,
        userId,
        dispatch,
        isPublic,
        restoreBaseSpeed,
        cancelHostGracePeriod,
        handleDriftCorrection,
        resolveAndPlayTrack,
        initiateHostGracePeriod,
        createPeerConnection
    ]);

    // Periodically sync host position for continuous drift evaluation
    useEffect(() => {
        if (!isHost || !isJoined) return;

        const interval = setInterval(() => {
            if (isHostRef.current && isPlayingRef.current) {
                broadcast('seek', {
                    time: currentTimeRef.current,
                    songId: currentSongRef.current?.id,
                    playbackSpeed: basePlaybackSpeedRef.current
                });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isHost, isJoined, broadcast]);

    // Reset temporary rate multiplier if session exits
    useEffect(() => {
        return () => {
            restoreBaseSpeed();
        };
    }, [restoreBaseSpeed]);

    return {
        broadcast,
        sendMessage,
        sendReaction,
        toggleCall,
        toggleMute,
        kickParticipant,
        toggleRoomChatMute,
        isInternalAction,
        restoreBaseSpeed
    };
};
