import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    setFriendsList,
    addDirectMessage,
    updateMessageStatus,
    markFriendMessagesSeen,
    setIncomingCall,
    setWaitingCall,
    promoteWaitingCall,
    setCallQuality,
    startDirectCall,
    updateCallStatus,
    setCallMuted,
    setCallVideoEnabled,
    setRemoteVideoEnabled,
    setCallFacingMode,
    setCallSpeakerOn,
    setCallType,
    endDirectCall,
} from '../features/friends/friendsSlice';
import { CallType } from '../types/call';
import { classifyCallQuality, getIceRestartDelay, getMediaAccessErrorMessage, MAX_ICE_RESTART_ATTEMPTS } from '../services/webrtc/callReliability';
import { persistentAudioManager } from '../services/webrtc/persistentAudioManager';
import { iceServerService } from '../services/webrtc/iceServerService';
import { showToast } from '../features/ui/uiSlice';
import {
    getFriendsLocal,
    saveFriendLocal,
    getDirectMessagesLocal,
    saveDirectMessageLocal,
    updateDirectMessageStatusLocal,
    updateDirectMessagesStatusByFriendLocal,
    getNextMessageSequenceLocal,
    saveCallLogLocal,
    isUserBlockedLocal,
    isMessageReplayOrDuplicateLocal,
    Friend,
    DirectMessage,
    CallLogEntry,
    CallOutcome,
} from '../utils/friendsDb';
import { e2eeService, EncryptedPayload } from '../services/e2eeService';
import { aggregateUserPresenceSessions } from '../utils/presenceUtils';
import { soundService } from '../services/soundService';
import { nativeCallNotificationService } from '../services/nativeCallNotificationService';
import { guestSessionService } from '../services/guestSessionService';

export interface DirectCommunicationContextValue {
    sendDirectMessage: (friendId: string, text: string) => Promise<void>;
    callFriend: (friend: Friend, requestedCallType?: CallType) => Promise<void>;
    acceptIncomingCall: (callerId: string, callerName: string) => Promise<void>;
    declineIncomingCall: (callerId: string) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => Promise<void>;
    toggleSpeaker: () => Promise<void>;
    flipCamera: () => Promise<void>;
    addNewFriend: (friendId: string, name: string) => Promise<void>;
    userId: string;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}

const DirectCommunicationContext = createContext<DirectCommunicationContextValue | null>(null);

export const DirectCommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { friendsList, activeFriendId, isCallActive, activeCallFriend, activeCall, incomingCall, waitingCall, isMuted } = useAppSelector(
        (state) => state.friends
    );
    const { onlinePresenceMap } = useAppSelector((state) => state.social);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const [guestId, setGuestId] = useState<string>(() => {
        try {
            const stored = localStorage.getItem('vibeon_user_code');
            if (stored && stored.startsWith('anon-')) return stored;
        } catch {
            // Handled safely
        }
        return `anon-guest-${Math.random().toString(36).substring(2, 8)}`;
    });

    useEffect(() => {
        if (!user?.id) {
            guestSessionService.getOrCreateGuestIdentityKey().then(({ guestId: verifiedGuestId }) => {
                setGuestId(verifiedGuestId);
            }).catch((err) => {
                console.warn('[DirectCommunication] Failed to initialize verified guest identity:', err);
            });
        }
    }, [user?.id]);

    const userId = user?.id || guestId;
    const userName = user?.user_metadata?.full_name || (user?.id ? 'Vibe User' : `Guest ${guestId.slice(-4)}`);

    const personalChannelRef = useRef<RealtimeChannel | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const activeFriendIdRef = useRef<string | null>(activeFriendId);
    activeFriendIdRef.current = activeFriendId;

    // WebRTC Perfect Negotiation state tracking
    const isPolitePeerRef = useRef<boolean>(false);
    const makingOfferRef = useRef<boolean>(false);
    const ignoreOfferRef = useRef<boolean>(false);
    const isSettingRemoteAnswerPendingRef = useRef<boolean>(false);
    const isProcessingOfferRef = useRef<boolean>(false);
    const pendingOffersQueueRef = useRef<Array<() => Promise<void>>>([]);
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

    // Call state refs for thread-safe access in closures & event callbacks
    const activeCallRef = useRef(activeCall);
    activeCallRef.current = activeCall;

    const incomingCallRef = useRef(incomingCall);
    incomingCallRef.current = incomingCall;

    const waitingCallRef = useRef(waitingCall);
    waitingCallRef.current = waitingCall;

    const isCallActiveRef = useRef(isCallActive);
    isCallActiveRef.current = isCallActive;

    const onlinePresenceMapRef = useRef(onlinePresenceMap);
    onlinePresenceMapRef.current = onlinePresenceMap;

    const ringingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const incomingRingingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const iceRestartAttemptsRef = useRef(0);
    const qualityIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastOutboundBytesRef = useRef<{ bytes: number; timestamp: number } | null>(null);
    const networkHandlersRef = useRef<{ online: () => void; offline: () => void; visible: () => void } | null>(null);

    // Cryptographically collision-resistant callId generator
    const generateCallId = (): string => {
        if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
            return `call-${window.crypto.randomUUID()}`;
        }
        return `call-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    };

    const clearTimers = useCallback(() => {
        if (ringingTimeoutRef.current) {
            clearTimeout(ringingTimeoutRef.current);
            ringingTimeoutRef.current = null;
        }
        if (incomingRingingTimeoutRef.current) {
            clearTimeout(incomingRingingTimeoutRef.current);
            incomingRingingTimeoutRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        soundService.stopIncomingCallRingtone();
        soundService.stopOutgoingCallRingback();
    }, []);

    // Managed outbound channel map with 30s idle disposal timeout
    const outboundChannelsRef = useRef<Map<string, { channel: RealtimeChannel; idleTimer: NodeJS.Timeout | null }>>(new Map());

    // Sign complete message envelope if sender is an unauthenticated guest
    const enrichPayloadWithGuestEnvelope = useCallback(async (targetUserId: string, event: string, payload: any) => {
        if (!user?.id && userId.startsWith('anon-') && event === 'direct_signal') {
            try {
                // Pass only media payload (sdp or candidate) or null for control signals
                const mediaData = payload.sdp || payload.candidate || null;
                const signedEnvelope = await guestSessionService.signSignalingEnvelope({
                    callId: payload.callId || '',
                    recipientId: targetUserId,
                    signalType: payload.signalType || '',
                    callType: payload.callType,
                    data: mediaData,
                });
                return {
                    ...payload,
                    signedEnvelope,
                };
            } catch (err) {
                console.warn('[DirectCommunication] Failed to sign signaling envelope:', err);
            }
        }
        return payload;
    }, [user?.id, userId]);

    // Helper to send message or signal via recipient channel with assured connection and idle cleanup
    const sendToUser = useCallback(async (targetUserId: string, event: string, payload: any) => {
        const targetChannelName = `user:${targetUserId}`;
        let entry = outboundChannelsRef.current.get(targetUserId);

        if (entry?.idleTimer) {
            clearTimeout(entry.idleTimer);
            entry.idleTimer = null;
        }

        let targetChannel = entry?.channel;
        if (!targetChannel) {
            targetChannel = supabase.channel(targetChannelName);
            entry = { channel: targetChannel, idleTimer: null };
            outboundChannelsRef.current.set(targetUserId, entry);
        }

        if (targetChannel.state !== 'joined') {
            await new Promise<void>((resolve) => {
                targetChannel!.subscribe((status) => {
                    if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        resolve();
                    }
                });
            });
        }

        try {
            const enrichedPayload = await enrichPayloadWithGuestEnvelope(targetUserId, event, payload);
            await targetChannel.send({
                type: 'broadcast',
                event,
                payload: enrichedPayload,
            });
        } catch (e) {
            console.warn(`Error sending ${event} to ${targetUserId}:`, e);
        } finally {
            // Schedule 30-second idle channel cleanup
            if (entry) {
                entry.idleTimer = setTimeout(() => {
                    try {
                        entry!.channel.unsubscribe();
                        supabase.removeChannel(entry!.channel);
                    } catch (cleanupErr) {
                        console.warn('[Realtime] Outbound channel cleanup error:', cleanupErr);
                    }
                    outboundChannelsRef.current.delete(targetUserId);
                }, 30000);
            }
        }
    }, [enrichPayloadWithGuestEnvelope]);

    // Cleanup all outbound channels on unmount
    useEffect(() => {
        return () => {
            outboundChannelsRef.current.forEach((entry) => {
                if (entry.idleTimer) clearTimeout(entry.idleTimer);
                try {
                    entry.channel.unsubscribe();
                    supabase.removeChannel(entry.channel);
                } catch {
                    // ignore
                }
            });
            outboundChannelsRef.current.clear();
        };
    }, []);

    // Initial load of local friends
    useEffect(() => {
        getFriendsLocal().then((list) => {
            dispatch(setFriendsList(list));
        });
    }, [dispatch]);

    // Initial load of messages and notify friend of 'seen' when active friend changes
    useEffect(() => {
        if (activeFriendId) {
            getDirectMessagesLocal(activeFriendId).then(async (messages) => {
                dispatch({
                    type: 'friends/setDirectMessages',
                    payload: { friendId: activeFriendId, messages },
                });
                sendToUser(activeFriendId, 'message_seen', {
                    senderId: userId,
                    timestamp: Date.now(),
                });
            });
        }
    }, [activeFriendId, dispatch, sendToUser, userId]);

    // Persist incoming calls that never become an active WebRTC call.
    const logIncomingCall = useCallback((
        call: { callId: string; callerId: string; callerName: string; callType: CallType; receivedAt?: number },
        outcome: CallOutcome
    ) => {
        const logEntry: CallLogEntry = {
            id: `log-${call.callId}`,
            callId: call.callId,
            peerId: call.callerId,
            peerName: call.callerName,
            direction: 'incoming',
            outcome,
            callType: call.callType,
            startedAt: call.receivedAt || Date.now(),
            durationSeconds: 0,
        };
        saveCallLogLocal(logEntry).catch((err) => console.warn('Error saving incoming call log:', err));
    }, []);

    // Idempotent resource cleanup with Call History logging
    const cleanupCallResources = useCallback((targetCallId?: string, outcomeOverride?: 'connected' | 'missed' | 'declined' | 'busy' | 'cancelled') => {
        clearTimers();
        iceRestartAttemptsRef.current = 0;
        lastOutboundBytesRef.current = null;

        const active = activeCallRef.current;
        if (active && (!targetCallId || active.callId === targetCallId)) {
            const duration = active.connectedAt ? Math.max(0, Math.floor((Date.now() - active.connectedAt) / 1000)) : 0;
            const outcome = outcomeOverride || (active.connectedAt ? 'connected' : (active.isIncoming ? 'missed' : 'cancelled'));

            const logEntry: CallLogEntry = {
                id: `log-${active.callId}`,
                callId: active.callId,
                peerId: active.friendId,
                peerName: active.friendName,
                direction: active.isIncoming ? 'incoming' : 'outgoing',
                outcome,
                callType: active.callType,
                startedAt: active.startedAt || Date.now(),
                durationSeconds: duration,
            };

            saveCallLogLocal(logEntry).catch((err) => console.warn('Error saving call log:', err));
        }

        if (qualityIntervalRef.current) {
            clearInterval(qualityIntervalRef.current);
            qualityIntervalRef.current = null;
        }
        if (networkHandlersRef.current && typeof window !== 'undefined') {
            window.removeEventListener('online', networkHandlersRef.current.online);
            window.removeEventListener('offline', networkHandlersRef.current.offline);
            document.removeEventListener('visibilitychange', networkHandlersRef.current.visible);
            networkHandlersRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => {
                try {
                    t.stop();
                } catch (e) {
                    console.warn('Error stopping local track:', e);
                }
            });
            localStreamRef.current = null;
            setLocalStream(null);
        }

        remoteStreamRef.current = null;
        setRemoteStream(null);
        persistentAudioManager.stop();

        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.onicecandidate = null;
                peerConnectionRef.current.ontrack = null;
                peerConnectionRef.current.oniceconnectionstatechange = null;
                peerConnectionRef.current.onconnectionstatechange = null;
                peerConnectionRef.current.onnegotiationneeded = null;
                peerConnectionRef.current.close();
            } catch (e) {
                console.warn('Error closing peer connection:', e);
            }
            peerConnectionRef.current = null;
        }

        dispatch(endDirectCall(targetCallId ? { callId: targetCallId } : undefined));
        dispatch(setCallQuality(null));
        dispatch(promoteWaitingCall());
        nativeCallNotificationService.stopForegroundCall();
    }, [clearTimers, dispatch]);

    // Setup RTCPeerConnection instance helper with Perfect Negotiation support
    const getOrCreatePeerConnection = useCallback((targetId: string, currentCallId: string) => {
        if (peerConnectionRef.current) return peerConnectionRef.current;

        // In Perfect Negotiation, the polite peer is deterministically the one with smaller userId
        isPolitePeerRef.current = userId < targetId;

        // Obtain initial ICE configuration with TURN relays immediately so iceTransportPolicy: 'relay' never fails
        const initialIce = iceServerService.getInitialIceServers();

        const pc = new RTCPeerConnection({
            iceServers: initialIce.iceServers,
            iceTransportPolicy: initialIce.iceTransportPolicy,
        });

        // Asynchronously update configuration with fresh dynamic ICE servers if available
        iceServerService.getIceServers().then((config) => {
            try {
                if (pc.setConfiguration && pc.signalingState !== 'closed') {
                    pc.setConfiguration({
                        iceServers: config.iceServers,
                        iceTransportPolicy: config.iceTransportPolicy,
                    });
                }
            } catch (configErr) {
                console.warn('[WebRTC] setConfiguration refresh error:', configErr);
            }
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // WebRTC Perfect Negotiation onnegotiationneeded handler
        pc.onnegotiationneeded = async () => {
            try {
                makingOfferRef.current = true;
                const offer = await pc.createOffer();
                if (pc.signalingState !== 'stable') return;
                await pc.setLocalDescription(offer);

                sendToUser(targetId, 'direct_signal', {
                    callId: currentCallId,
                    senderId: userId,
                    senderName: userName,
                    signalType: 'offer',
                    sdp: pc.localDescription,
                });
            } catch (err) {
                console.warn('onnegotiationneeded error:', err);
            } finally {
                makingOfferRef.current = false;
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendToUser(targetId, 'direct_signal', {
                    callId: currentCallId,
                    senderId: userId,
                    senderName: userName,
                    signalType: 'ice-candidate',
                    candidate: event.candidate,
                });
            }
        };

        pc.ontrack = (event) => {
            const stream = (event.streams && event.streams[0])
                ? event.streams[0]
                : new MediaStream([event.track]);

            remoteStreamRef.current = stream;
            setRemoteStream(stream);

            // Handle audio routing
            if (event.track.kind === 'audio') {
                event.track.enabled = true;
                persistentAudioManager.attachStream(stream);
            }

            // Handle video track events
            if (event.track.kind === 'video') {
                dispatch(setRemoteVideoEnabled(event.track.enabled && !event.track.muted));

                event.track.onmute = () => {
                    dispatch(setRemoteVideoEnabled(false));
                };
                event.track.onunmute = () => {
                    dispatch(setRemoteVideoEnabled(true));
                };
                event.track.onended = () => {
                    dispatch(setRemoteVideoEnabled(false));
                };
            }
        };

        const attemptIceRestart = async () => {
            if (pc.signalingState === 'closed' || peerConnectionRef.current !== pc ||
                iceRestartAttemptsRef.current >= MAX_ICE_RESTART_ATTEMPTS) return;

            iceRestartAttemptsRef.current += 1;
            dispatch(updateCallStatus({ status: 'reconnecting', callId: currentCallId }));
            try {
                const freshConfig = await iceServerService.getIceServers();
                if (pc.signalingState === 'closed' || peerConnectionRef.current !== pc) return;
                pc.setConfiguration({
                    iceServers: freshConfig.iceServers,
                    iceTransportPolicy: freshConfig.iceTransportPolicy,
                });
                const offer = await pc.createOffer({ iceRestart: true });
                if (pc.signalingState === 'closed' || peerConnectionRef.current !== pc) return;
                await pc.setLocalDescription(offer);
                await sendToUser(targetId, 'direct_signal', {
                    callId: currentCallId,
                    senderId: userId,
                    senderName: userName,
                    signalType: 'offer',
                    sdp: pc.localDescription,
                });
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    if (peerConnectionRef.current === pc &&
                        !['connected', 'completed'].includes(pc.iceConnectionState)) {
                        if (iceRestartAttemptsRef.current >= MAX_ICE_RESTART_ATTEMPTS) {
                            dispatch(showToast({ message: 'The network is still unstable. Try switching networks or ending the call.', type: 'error' }));
                        } else {
                            scheduleIceRestart(true);
                        }
                    }
                }, 9000);
            } catch (error) {
                console.warn('[WebRTC] ICE restart attempt failed:', error);
                if (iceRestartAttemptsRef.current < MAX_ICE_RESTART_ATTEMPTS && !reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectTimeoutRef.current = null;
                        void attemptIceRestart();
                    }, getIceRestartDelay(iceRestartAttemptsRef.current));
                } else if (iceRestartAttemptsRef.current >= MAX_ICE_RESTART_ATTEMPTS) {
                    dispatch(showToast({ message: 'Unable to restore the call connection. End the call and try again.', type: 'error' }));
                }
            }
        };

        const scheduleIceRestart = (immediate = false) => {
            if (reconnectTimeoutRef.current || iceRestartAttemptsRef.current >= MAX_ICE_RESTART_ATTEMPTS) return;
            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                void attemptIceRestart();
            }, immediate ? 0 : getIceRestartDelay(iceRestartAttemptsRef.current + 1));
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            if (state === 'connected' || state === 'completed') {
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
                iceRestartAttemptsRef.current = 0;
                dispatch(updateCallStatus({ status: 'connected', callId: currentCallId }));
            } else if (state === 'disconnected') {
                dispatch(updateCallStatus({ status: 'reconnecting', callId: currentCallId }));
                scheduleIceRestart();
            } else if (state === 'failed') {
                dispatch(updateCallStatus({ status: 'reconnecting', callId: currentCallId }));
                scheduleIceRestart(true);
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                iceRestartAttemptsRef.current = 0;
                dispatch(updateCallStatus({ status: 'connected', callId: currentCallId }));
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                dispatch(updateCallStatus({ status: 'reconnecting', callId: currentCallId }));
                scheduleIceRestart(pc.connectionState === 'failed');
            }
        };

        const handleNetworkOnline = () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
            scheduleIceRestart(true);
        };
        const handleNetworkOffline = () => dispatch(updateCallStatus({ status: 'reconnecting', callId: currentCallId }));
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !['connected', 'completed'].includes(pc.iceConnectionState)) {
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
                scheduleIceRestart(true);
            }
        };
        if (typeof window !== 'undefined') {
            networkHandlersRef.current = { online: handleNetworkOnline, offline: handleNetworkOffline, visible: handleVisibilityChange };
            window.addEventListener('online', handleNetworkOnline);
            window.addEventListener('offline', handleNetworkOffline);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
        qualityIntervalRef.current = setInterval(async () => {
            if (pc.signalingState === 'closed' || peerConnectionRef.current !== pc) return;
            try {
                const stats = await pc.getStats();
                let rttMs: number | null = null;
                let jitterMs: number | null = null;
                let packetsLost = 0;
                let packetsReceived = 0;
                let bitrateKbps: number | null = null;
                let outboundBytes: number | null = null;
                let outboundTimestamp: number | null = null;

                stats.forEach((stat: any) => {
                    if (stat.type === 'candidate-pair' && (stat.selected || (stat.nominated && stat.state === 'succeeded'))) {
                        if (typeof stat.currentRoundTripTime === 'number') rttMs = stat.currentRoundTripTime * 1000;
                    }
                    if (stat.type === 'remote-inbound-rtp' && typeof stat.roundTripTime === 'number') {
                        rttMs = stat.roundTripTime * 1000;
                    }
                    if (stat.type === 'inbound-rtp' && !stat.isRemote) {
                        if (typeof stat.jitter === 'number') jitterMs = stat.jitter * 1000;
                        packetsLost += Math.max(0, stat.packetsLost || 0);
                        packetsReceived += Math.max(0, stat.packetsReceived || 0);
                    }
                    if (stat.type === 'outbound-rtp' && !stat.isRemote && typeof stat.bytesSent === 'number') {
                        outboundBytes = (outboundBytes || 0) + stat.bytesSent;
                        outboundTimestamp = stat.timestamp;
                    }
                });

                if (outboundBytes !== null && outboundTimestamp !== null) {
                    const previous = lastOutboundBytesRef.current;
                    if (previous && outboundTimestamp > previous.timestamp && outboundBytes >= previous.bytes) {
                        bitrateKbps = ((outboundBytes - previous.bytes) * 8) /
                            (outboundTimestamp - previous.timestamp);
                    }
                    lastOutboundBytesRef.current = { bytes: outboundBytes, timestamp: outboundTimestamp };
                }
                const packetLossPercent = packetsLost + packetsReceived > 0
                    ? (packetsLost / (packetsLost + packetsReceived)) * 100
                    : null;
                dispatch(setCallQuality(classifyCallQuality({ rttMs, jitterMs, packetLossPercent, bitrateKbps })));
            } catch (error) {
                console.debug('[WebRTC] getStats quality sample unavailable:', error);
            }
        }, 3000);

        peerConnectionRef.current = pc;
        return pc;
    }, [userId, userName, sendToUser, dispatch, cleanupCallResources]);

    // Main signaling listener on personal channel
    useEffect(() => {
        const channelName = `user:${userId}`;
        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { ack: false, self: false },
            },
        });

        channel
            .on('broadcast', { event: 'direct_message' }, async ({ payload }) => {
                const incomingPayload = payload as {
                    id: string;
                    senderId: string;
                    senderName: string;
                    text?: string;
                    encrypted?: EncryptedPayload;
                    timestamp: number;
                    seq?: number;
                };

                if (!incomingPayload?.senderId) return;

                // Check blocklist
                const isBlocked = await isUserBlockedLocal(incomingPayload.senderId);
                if (isBlocked) {
                    console.info('[DirectComms] Dropped direct_message from blocked user:', incomingPayload.senderId);
                    return;
                }

                // Sequence Replay and Duplicate Message Defense:
                // Check if message ID already exists or if sequence number is regressive
                const replayCheck = await isMessageReplayOrDuplicateLocal(
                    incomingPayload.senderId,
                    incomingPayload.id,
                    incomingPayload.seq
                );

                if (replayCheck.isDuplicate) {
                    console.warn('[DirectComms] Dropping duplicate message with existing ID:', incomingPayload.id);
                    return;
                }

                if (replayCheck.isReplay) {
                    console.warn(
                        `[DirectComms] Dropping replayed or out-of-order message from ${incomingPayload.senderId}. Incoming seq ${incomingPayload.seq} <= last seen ${replayCheck.maxSeq}`
                    );
                    return;
                }

                // Cryptographic Key Change Detection & Verification:
                // If message provides sender's public key (root or inside encrypted payload), record it safely
                const senderPubJwk = (incomingPayload as any).senderPublicKey || incomingPayload.encrypted?.senderPublicKey;
                let keyChangedAlert = false;

                if (senderPubJwk) {
                    const keyComparison = await e2eeService.recordPeerPublicKey(incomingPayload.senderId, senderPubJwk, false);
                    if (keyComparison.status === 'changed') {
                        keyChangedAlert = true;
                        console.warn(
                            `[DirectComms] Security Alert: Peer ${incomingPayload.senderId} public key has changed! ` +
                            `Old: ${keyComparison.oldFingerprint.slice(0, 8)}..., New: ${keyComparison.newFingerprint.slice(0, 8)}...`
                        );
                        dispatch(showToast({
                            message: `Security notice: ${incomingPayload.senderName || 'Contact'} identity key has changed.`,
                            type: 'info',
                        }));
                    }
                }

                // Decrypt message if encrypted payload is provided
                let decryptedText = incomingPayload.text || '';
                if (incomingPayload.encrypted) {
                    try {
                        decryptedText = await e2eeService.decryptMessage(incomingPayload.senderId, incomingPayload.encrypted);
                    } catch (decErr) {
                        console.warn('[DirectComms] Decryption failed, falling back to raw text if present:', decErr);
                        decryptedText = incomingPayload.text || '🔒 [Encrypted message - could not decrypt]';
                    }
                }

                if (keyChangedAlert) {
                    decryptedText = `⚠️ [Security notice: Sender's cryptographic key changed]\n${decryptedText}`;
                }

                const currentFriends = await getFriendsLocal();
                if (!currentFriends.some((f) => f.id === incomingPayload.senderId)) {
                    const newContact: Friend = {
                        id: incomingPayload.senderId,
                        name: incomingPayload.senderName || 'Friend',
                        addedAt: Date.now(),
                    };
                    await saveFriendLocal(newContact);
                    const updated = await getFriendsLocal();
                    dispatch(setFriendsList(updated));
                }

                const isCurrentlyChatting = activeFriendIdRef.current === incomingPayload.senderId;
                const statusOnReceipt = isCurrentlyChatting ? 'seen' : 'delivered';

                const localMsg: DirectMessage = {
                    id: incomingPayload.id,
                    friendId: incomingPayload.senderId,
                    senderId: incomingPayload.senderId,
                    senderName: incomingPayload.senderName || 'Friend',
                    text: decryptedText,
                    timestamp: incomingPayload.timestamp || Date.now(),
                    seq: incomingPayload.seq,
                    status: statusOnReceipt,
                };
                await saveDirectMessageLocal(localMsg);
                dispatch(addDirectMessage(localMsg));

                // Play incoming message notification sound (throttled, never on own messages)
                soundService.playMessageSound();

                sendToUser(incomingPayload.senderId, isCurrentlyChatting ? 'message_seen' : 'message_ack', {
                    messageId: incomingPayload.id,
                    senderId: userId,
                    timestamp: Date.now(),
                });
            })
            .on('broadcast', { event: 'message_ack' }, async ({ payload }) => {
                const { messageId, senderId } = payload;
                await updateDirectMessageStatusLocal(messageId, 'delivered');
                dispatch(updateMessageStatus({ friendId: senderId, messageId, status: 'delivered' }));
            })
            .on('broadcast', { event: 'message_seen' }, async ({ payload }) => {
                const { messageId, senderId } = payload;
                if (messageId) {
                    await updateDirectMessageStatusLocal(messageId, 'seen');
                    dispatch(updateMessageStatus({ friendId: senderId, messageId, status: 'seen' }));
                } else if (senderId) {
                    await updateDirectMessagesStatusByFriendLocal(senderId, 'seen');
                    dispatch(markFriendMessagesSeen({ friendId: senderId }));
                }
            })
            .on('broadcast', { event: 'direct_signal' }, async ({ payload }) => {
                const { callId, senderId, senderName, signalType, sdp, candidate, callType = 'audio', signedEnvelope } = payload;

                if (!senderId || !signalType) return;

                // Cryptographic Guest Identity, Message Envelope & Replay Verification
                if (senderId.startsWith('anon-')) {
                    if (!signedEnvelope) {
                        console.warn('[DirectComms] Dropped direct_signal from unverified guest (missing signedEnvelope):', senderId);
                        return;
                    }
                    // Evaluate exact media data matching what sender signed
                    const actualData = sdp || candidate || null;
                    const verifyResult = await guestSessionService.verifySignalingEnvelope(
                        signedEnvelope,
                        userId, // expected recipientId is us!
                        signalType,
                        actualData
                    );
                    if (!verifyResult.isValid) {
                        console.warn(`[DirectComms] Dropped forged/tampered/replayed guest signal from ${senderId}:`, verifyResult.reason);
                        return;
                    }
                }

                // Check blocklist for signaling
                const isBlocked = await isUserBlockedLocal(senderId);
                if (isBlocked) {
                    console.info('[DirectComms] Dropped direct_signal from blocked user:', senderId);
                    if (signalType === 'call-request') {
                        sendToUser(senderId, 'direct_signal', {
                            callId,
                            senderId: userId,
                            senderName: userName,
                            signalType: 'call-declined',
                        });
                    }
                    return;
                }

                // Handle incoming call request
                if (signalType === 'call-request') {
                    const isBusy = (isCallActiveRef.current && activeCallRef.current?.status !== 'ended') ||
                                   (incomingCallRef.current && incomingCallRef.current.callId !== callId);

                    // Glare resolution: simultaneous calls
                    if (isCallActiveRef.current && activeCallRef.current?.status === 'ringing' && activeCallRef.current.friendId === senderId) {
                        if (userId > senderId) {
                            sendToUser(senderId, 'direct_signal', {
                                callId,
                                senderId: userId,
                                senderName: userName,
                                signalType: 'call-busy',
                            });
                            return;
                        } else {
                            cleanupCallResources(activeCallRef.current.callId);
                        }
                    } else if (isBusy) {
                        const canWait = Boolean(activeCallRef.current && !incomingCallRef.current && !waitingCallRef.current);
                        if (canWait) {
                            const waitingPayload = {
                                callId: callId || `call-${Date.now()}`,
                                callerId: senderId,
                                callerName: senderName || 'Caller',
                                channelName: `user:${userId}`,
                                callType,
                                receivedAt: Date.now(),
                            };
                            dispatch(setWaitingCall(waitingPayload));
                            sendToUser(senderId, 'direct_signal', {
                                callId,
                                senderId: userId,
                                senderName: userName,
                                signalType: 'call-waiting',
                            });
                            dispatch(showToast({ message: `Call waiting: ${waitingPayload.callerName}`, type: 'info' }));
                        } else {
                            sendToUser(senderId, 'direct_signal', {
                                callId,
                                senderId: userId,
                                senderName: userName,
                                signalType: 'call-busy',
                            });
                        }
                        return;
                    }

                    const currentFriends = await getFriendsLocal();
                    if (!currentFriends.some((f) => f.id === senderId)) {
                        const newContact: Friend = {
                            id: senderId,
                            name: senderName || 'Caller',
                            addedAt: Date.now(),
                        };
                        await saveFriendLocal(newContact);
                        const updated = await getFriendsLocal();
                        dispatch(setFriendsList(updated));
                    }

                    const incomingCallPayload = {
                        callId: callId || `call-${Date.now()}`,
                        callerId: senderId,
                        callerName: senderName || 'Friend',
                        channelName: `user:${userId}`,
                        callType,
                        receivedAt: Date.now(),
                    };

                    dispatch(setIncomingCall(incomingCallPayload));

                    // Start continuous ringtone
                    soundService.startIncomingCallRingtone(callType);

                    // Callee-side 45-second auto-expiration (VIBE-BUG-004)
                    if (incomingRingingTimeoutRef.current) clearTimeout(incomingRingingTimeoutRef.current);
                    incomingRingingTimeoutRef.current = setTimeout(() => {
                        const expiredCall = incomingCallRef.current;
                        if (expiredCall?.callId === incomingCallPayload.callId) {
                            logIncomingCall(expiredCall, 'missed');
                            soundService.stopIncomingCallRingtone();
                            dispatch(setIncomingCall(null));
                            dispatch(showToast({ message: `Missed call from ${senderName || 'Friend'}`, type: 'info' }));
                        }
                    }, 45000);
                    return;
                }

                const activeId = activeCallRef.current?.callId;
                const incomingId = incomingCallRef.current?.callId;

                if (signalType === 'call-cancelled') {
                    if (waitingCallRef.current?.callId === callId) {
                        dispatch(setWaitingCall(null));
                        dispatch(showToast({ message: `${senderName || 'Caller'} cancelled the waiting call`, type: 'info' }));
                        return;
                    }
                    soundService.stopIncomingCallRingtone();
                    if (incomingRingingTimeoutRef.current) {
                        clearTimeout(incomingRingingTimeoutRef.current);
                        incomingRingingTimeoutRef.current = null;
                    }
                    if (incomingId === callId || (!incomingId && !activeId)) {
                        const cancelledIncoming = incomingId === callId ? incomingCallRef.current : null;
                        if (cancelledIncoming) logIncomingCall(cancelledIncoming, 'cancelled');
                        dispatch(setIncomingCall(null));
                        dispatch(showToast({ message: `${senderName || 'Caller'} cancelled the call` }));
                    }
                    return;
                }

                if (signalType === 'call-waiting') {
                    if (activeId === callId) {
                        dispatch(showToast({ message: `${senderName || 'Contact'} will be waiting while you finish another call.`, type: 'info' }));
                    }
                    return;
                }

                if (signalType === 'call-busy') {
                    if (activeId === callId) {
                        dispatch(showToast({ message: `${senderName || 'Contact'} is busy on another call`, type: 'info' }));
                        cleanupCallResources(callId, 'busy');
                    }
                    return;
                }

                if (signalType === 'call-declined') {
                    soundService.stopIncomingCallRingtone();
                    if (activeId === callId) {
                        dispatch(showToast({ message: `${senderName || 'Contact'} declined the call` }));
                        cleanupCallResources(callId, 'declined');
                    }
                    return;
                }

                if (signalType === 'call-ended') {
                    soundService.stopIncomingCallRingtone();
                    if (activeId === callId || incomingId === callId) {
                        dispatch(showToast({ message: 'Call ended' }));
                        cleanupCallResources(callId);
                    }
                    return;
                }

                // Handle call acceptance
                if (signalType === 'call-accepted') {
                    if (activeId !== callId) return;

                    clearTimers();
                    dispatch(updateCallStatus({ status: 'connecting', callId }));

                    // Trigger offer generation via getOrCreatePeerConnection onnegotiationneeded
                    getOrCreatePeerConnection(senderId, callId);
                    return;
                }

                // Handle WebRTC Offer with Perfect Negotiation glare resolution and atomic queuing
                if (signalType === 'offer') {
                    if (activeId !== callId) return;

                    clearTimers();

                    const executeOffer = async () => {
                        const pc = getOrCreatePeerConnection(senderId, callId);

                        const readyForOffer = !makingOfferRef.current &&
                            (pc.signalingState === 'stable' || isSettingRemoteAnswerPendingRef.current);
                        const offerCollision = !readyForOffer;

                        ignoreOfferRef.current = !isPolitePeerRef.current && offerCollision;
                        if (ignoreOfferRef.current) {
                            console.info('[WebRTC Perfect Negotiation] Glare detected: impolite peer ignoring incoming offer');
                            return;
                        }

                        // Polite peer executes rollback on offer collision if local offer is uncommitted
                        if (offerCollision && pc.signalingState !== 'stable') {
                            try {
                                await pc.setLocalDescription({ type: 'rollback' });
                            } catch (rollbackErr) {
                                console.warn('[WebRTC Perfect Negotiation] Polite peer rollback warning:', rollbackErr);
                            }
                        }

                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);

                            sendToUser(senderId, 'direct_signal', {
                                callId,
                                senderId: userId,
                                senderName: userName,
                                signalType: 'answer',
                                sdp: answer,
                            });

                            // Flush buffered early ICE candidates
                            while (pendingIceCandidatesRef.current.length > 0) {
                                const cand = pendingIceCandidatesRef.current.shift();
                                if (cand) {
                                    await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                                }
                            }
                        } catch (err) {
                            console.warn('Error handling offer in Perfect Negotiation:', err);
                        }
                    };

                    if (isProcessingOfferRef.current) {
                        pendingOffersQueueRef.current.push(executeOffer);
                        return;
                    }

                    isProcessingOfferRef.current = true;
                    try {
                        await executeOffer();
                        while (pendingOffersQueueRef.current.length > 0) {
                            const nextOffer = pendingOffersQueueRef.current.shift();
                            if (nextOffer) {
                                await nextOffer();
                            }
                        }
                    } finally {
                        isProcessingOfferRef.current = false;
                    }
                    return;
                }

                // Handle WebRTC Answer
                if (signalType === 'answer') {
                    if (activeId !== callId) return;

                    const pc = peerConnectionRef.current;
                    if (pc && pc.signalingState === 'have-local-offer') {
                        try {
                            isSettingRemoteAnswerPendingRef.current = true;
                            await pc.setRemoteDescription(new RTCSessionDescription(sdp));

                            // Flush buffered early ICE candidates
                            while (pendingIceCandidatesRef.current.length > 0) {
                                const cand = pendingIceCandidatesRef.current.shift();
                                if (cand) {
                                    await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                                }
                            }
                        } catch (err) {
                            console.warn('Error setting remote answer:', err);
                        } finally {
                            isSettingRemoteAnswerPendingRef.current = false;
                        }
                    }
                    return;
                }

                // Handle remote camera toggle notification & voice-to-video upgrade/downgrade
                if (signalType === 'camera-toggle') {
                    if (activeId === callId) {
                        const isVideoOn = Boolean(payload.isVideoEnabled);
                        dispatch(setRemoteVideoEnabled(isVideoOn));

                        const currentCall = activeCallRef.current;
                        if (isVideoOn) {
                            // If remote peer upgraded their camera, promote callType to video
                            dispatch(setCallType('video'));
                        } else {
                            // If remote peer disabled camera, and local camera is also not active, revert callType to audio
                            if (!currentCall?.isVideoEnabled) {
                                dispatch(setCallType('audio'));
                            }
                        }
                    }
                    return;
                }

                // Handle ICE Candidate with early candidate buffering
                if (signalType === 'ice-candidate') {
                    if (activeId !== callId) return;

                    const pc = peerConnectionRef.current;
                    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (e) {
                            if (!ignoreOfferRef.current) {
                                console.warn('Error adding ICE candidate:', e);
                            }
                        }
                    } else if (candidate) {
                        // Buffer candidate until remoteDescription is set
                        pendingIceCandidatesRef.current.push(candidate);
                    }
                    return;
                }
            })
            .subscribe();

        personalChannelRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [userId, userName, dispatch, getOrCreatePeerConnection, sendToUser, cleanupCallResources, clearTimers, logIncomingCall]);

    // Calls promoted from the waiting queue use the same ringing timeout and missed-call history path.
    useEffect(() => {
        if (!incomingCall || incomingRingingTimeoutRef.current) return;
        soundService.startIncomingCallRingtone(incomingCall.callType);
        incomingRingingTimeoutRef.current = setTimeout(() => {
            const expiredCall = incomingCallRef.current;
            if (expiredCall?.callId === incomingCall.callId) {
                logIncomingCall(expiredCall, 'missed');
                soundService.stopIncomingCallRingtone();
                dispatch(setIncomingCall(null));
                dispatch(showToast({ message: `Missed call from ${expiredCall.callerName}`, type: 'info' }));
            }
            incomingRingingTimeoutRef.current = null;
        }, 45000);
        return () => {
            // Do not clear a ringing timer on unrelated renders; only clear when the call identity changes.
        };
    }, [incomingCall?.callId, dispatch, logIncomingCall]);

    // Send 1-on-1 direct message with E2EE encryption and sequence counter
    const sendDirectMessage = useCallback(async (friendId: string, text: string) => {
        if (!text.trim()) return;

        const cleanText = text.trim();
        const nextSeq = await getNextMessageSequenceLocal(friendId);
        const messageId = Date.now().toString() + Math.random().toString(36).substring(7);

        const msg: DirectMessage = {
            id: messageId,
            friendId,
            senderId: userId,
            senderName: userName,
            text: cleanText,
            timestamp: Date.now(),
            seq: nextSeq,
            status: 'sent',
        };

        // Save unencrypted plaintext locally in IndexedDB (local storage is considered secure on-device)
        await saveDirectMessageLocal(msg);
        dispatch(addDirectMessage(msg));

        // Obtain our local identity public key to share in-band for zero-friction key exchange
        let myPublicKeyJwk: JsonWebKey | undefined;
        try {
            const identity = await e2eeService.getOrCreateLocalIdentity();
            myPublicKeyJwk = identity.publicKeyJwk;
        } catch (idErr) {
            console.warn('[DirectComms] Could not export local identity public key:', idErr);
        }

        // Attempt E2EE encryption before sending over Supabase Realtime broadcast
        let encryptedPayload: EncryptedPayload | undefined;
        try {
            encryptedPayload = await e2eeService.encryptMessage(friendId, cleanText);
        } catch (encErr) {
            console.info('[DirectComms] Initial message handshake - transmitting initial plaintext with in-band public key exchange:', encErr);
        }

        const networkPayload = {
            id: msg.id,
            senderId: userId,
            senderName: userName,
            text: encryptedPayload ? '' : cleanText,
            encrypted: encryptedPayload,
            senderPublicKey: myPublicKeyJwk,
            timestamp: msg.timestamp,
            seq: nextSeq,
        };

        sendToUser(friendId, 'direct_message', networkPayload);
    }, [userId, userName, dispatch, sendToUser]);

    // Acquire media stream with camera fallback
    const acquireMediaStream = async (requestedCallType: CallType): Promise<{ stream: MediaStream; hasVideo: boolean }> => {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('MEDIA_DEVICES_UNAVAILABLE');
        }
        if (requestedCallType === 'video') {
            let audioStream: MediaStream;
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (error) {
                dispatch(showToast({ message: getMediaAccessErrorMessage(error, 'microphone'), type: 'error' }));
                throw error;
            }
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                });
                const videoTrack = videoStream.getVideoTracks()[0];
                if (videoTrack) audioStream.addTrack(videoTrack);
                return { stream: audioStream, hasVideo: Boolean(videoTrack) };
            } catch (error) {
                dispatch(showToast({ message: `${getMediaAccessErrorMessage(error, 'camera')} Continuing with voice only.`, type: 'info' }));
                return { stream: audioStream, hasVideo: false };
            }
        }
        try {
            return { stream: await navigator.mediaDevices.getUserMedia({ audio: true, video: false }), hasVideo: false };
        } catch (error) {
            dispatch(showToast({ message: getMediaAccessErrorMessage(error, 'microphone'), type: 'error' }));
            throw error;
        }
    };

    // Receiver presence availability check reusing aggregateUserPresenceSessions
    // Inherits strict 15s future-drift tolerance, 90s stale threshold, and online=false filtering
    const checkRecipientOnline = useCallback((targetUserId: string): boolean => {
        const now = Date.now();

        // 1. Inspect presence state in active joined social:presence channel
        try {
            const channels = supabase.getChannels();
            const globalChannel = channels.find(
                (c) =>
                    (c.topic === 'realtime:social:presence' || c.topic === 'social:presence') &&
                    c.state === 'joined'
            );
            if (globalChannel) {
                const presenceState = globalChannel.presenceState();
                const sessions = presenceState[targetUserId] as any[];
                if (Array.isArray(sessions) && sessions.length > 0) {
                    const aggregated = aggregateUserPresenceSessions(sessions, now);
                    if (aggregated.online) return true;
                }
            }
        } catch (err) {
            console.warn('[DirectComms] Could not inspect channel presence state:', err);
        }

        // 2. Fallback to local Redux onlinePresenceMap (evaluated with same validation rules)
        const mapEntry = onlinePresenceMapRef.current[targetUserId];
        if (mapEntry) {
            const aggregated = aggregateUserPresenceSessions([mapEntry], now);
            if (aggregated.online) return true;
        }

        return false;
    }, []);

    // Start 1-click call to a friend (supports audio and video)
    // Signaling-First implementation: Presence is informational, NOT an unconditional gate.
    const callFriend = useCallback(async (friend: Friend, requestedCallType: CallType = 'audio') => {
        if (isCallActiveRef.current || incomingCallRef.current) {
            dispatch(showToast({ message: 'Finish or decline the current call before starting another.', type: 'info' }));
            return;
        }
        // Presence is evaluated for informational awareness only (e.g. logging)
        const isOnline = checkRecipientOnline(friend.id);
        if (!isOnline) {
            console.info(`[DirectCommunication] Recipient ${friend.name} presence is not currently visible; proceeding with signaling-first invitation.`);
        }

        try {
            const { stream, hasVideo } = await acquireMediaStream(requestedCallType);
            localStreamRef.current = stream;
            setLocalStream(stream);

            const newCallId = generateCallId();

            dispatch(startDirectCall({
                callId: newCallId,
                friendId: friend.id,
                friendName: friend.name,
                callType: requestedCallType,
                isIncoming: false,
            }));

            if (requestedCallType === 'video' && !hasVideo) {
                dispatch(setCallVideoEnabled(false));
            }

            // Start playing standard telephone-style rhythmic ringback tone for caller
            soundService.startOutgoingCallRingback();

            // Attempt authorized signaling over Realtime channel
            sendToUser(friend.id, 'direct_signal', {
                callId: newCallId,
                senderId: userId,
                senderName: userName,
                signalType: 'call-request',
                callType: requestedCallType,
                sentAt: Date.now(),
            });

            clearTimers();
            ringingTimeoutRef.current = setTimeout(() => {
                if (activeCallRef.current?.status === 'ringing' && activeCallRef.current.callId === newCallId) {
                    dispatch(showToast({ message: `${friend.name || 'User'} is unavailable`, type: 'info' }));
                    sendToUser(friend.id, 'direct_signal', {
                        callId: newCallId,
                        senderId: userId,
                        senderName: userName,
                        signalType: 'call-cancelled',
                    });
                    cleanupCallResources(newCallId, 'missed');
                }
            }, 45000);
        } catch (err) {
            console.error('Failed to get media stream:', err);
            if (err instanceof Error && err.message === 'MEDIA_DEVICES_UNAVAILABLE') {
                dispatch(showToast({ message: 'This browser or device does not support microphone access.', type: 'error' }));
            }
        }
    }, [checkRecipientOnline, userId, userName, dispatch, sendToUser, clearTimers, cleanupCallResources]);

    // Accept incoming call (supports audio and video)
    const acceptIncomingCall = useCallback(async (callerId: string, callerName: string) => {
        soundService.stopIncomingCallRingtone();
        if (incomingRingingTimeoutRef.current) {
            clearTimeout(incomingRingingTimeoutRef.current);
            incomingRingingTimeoutRef.current = null;
        }

        const incoming = incomingCallRef.current;
        if (isCallActiveRef.current) {
            dispatch(showToast({ message: 'End the active call before answering the waiting call.', type: 'info' }));
            return;
        }
        const currentCallId = incoming?.callId || generateCallId();
        const incomingCallType = incoming?.callType || 'audio';

        try {
            const { stream, hasVideo } = await acquireMediaStream(incomingCallType);
            localStreamRef.current = stream;
            setLocalStream(stream);

            const friendObj: Friend = {
                id: callerId,
                name: callerName,
                addedAt: Date.now(),
            };

            await saveFriendLocal(friendObj);

            dispatch(startDirectCall({
                callId: currentCallId,
                friendId: callerId,
                friendName: callerName,
                callType: incomingCallType,
                isIncoming: true,
            }));

            if (incomingCallType === 'video' && !hasVideo) {
                dispatch(setCallVideoEnabled(false));
            }

            // Pre-initialize RTCPeerConnection and attach local media tracks immediately upon accepting
            getOrCreatePeerConnection(callerId, currentCallId);

            sendToUser(callerId, 'direct_signal', {
                callId: currentCallId,
                senderId: userId,
                senderName: userName,
                signalType: 'call-accepted',
            });
        } catch (err) {
            console.error('Failed to accept call media stream:', err);
            dispatch(showToast({ message: 'Could not access audio hardware', type: 'error' }));
            dispatch(setIncomingCall(null));
            sendToUser(callerId, 'direct_signal', {
                callId: currentCallId,
                senderId: userId,
                senderName: userName,
                signalType: 'call-declined',
            });
        }
    }, [userId, userName, dispatch, sendToUser]);

    // Decline incoming call
    const declineIncomingCall = useCallback((callerId: string) => {
        soundService.stopIncomingCallRingtone();
        if (incomingRingingTimeoutRef.current) {
            clearTimeout(incomingRingingTimeoutRef.current);
            incomingRingingTimeoutRef.current = null;
        }

        const incoming = incomingCallRef.current;
        const currentCallId = incoming?.callId;
        if (incoming) logIncomingCall(incoming, 'declined');

        dispatch(setIncomingCall(null));
        dispatch(promoteWaitingCall());
        sendToUser(callerId, 'direct_signal', {
            callId: currentCallId,
            senderId: userId,
            senderName: userName,
            signalType: 'call-declined',
        });
    }, [userId, userName, dispatch, sendToUser, logIncomingCall]);

    // End / Cancel current call
    const endCall = useCallback(() => {
        const active = activeCallRef.current;
        const targetFriendId = active?.friendId || activeCallFriend?.id;
        const targetCallId = active?.callId;

        if (targetFriendId) {
            const signalType = active?.status === 'ringing' ? 'call-cancelled' : 'call-ended';
            sendToUser(targetFriendId, 'direct_signal', {
                callId: targetCallId,
                senderId: userId,
                senderName: userName,
                signalType,
            });
        }

        cleanupCallResources(targetCallId);
    }, [activeCallFriend, userId, userName, sendToUser, cleanupCallResources]);

    // Toggle Microphone Mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            const willBeMuted = !isMuted;
            audioTracks.forEach((track) => {
                track.enabled = !willBeMuted;
            });
            dispatch(setCallMuted(willBeMuted));
        }
    }, [isMuted, dispatch]);

    // Synchronize ongoing call state to native Android notification and listen for native notification action buttons
    useEffect(() => {
        if (!isCallActive || !activeCall) {
            nativeCallNotificationService.stopForegroundCall();
            nativeCallNotificationService.abandonAudioFocus();
            nativeCallNotificationService.removeAudioLifecycleListeners();
            return;
        }

        nativeCallNotificationService.startForegroundCall({
            friendName: activeCall.friendName,
            callType: activeCall.callType,
        });
        nativeCallNotificationService.requestAudioFocus();
        nativeCallNotificationService.setupAudioLifecycleListeners({
            onFocusLost: () => persistentAudioManager.setVolume(0.35),
            onFocusGained: () => persistentAudioManager.setVolume(1),
            onBecomingNoisy: () => {
                nativeCallNotificationService.setSpeakerphoneOn(false);
                persistentAudioManager.setSinkId('default');
                dispatch(setCallSpeakerOn(false));
            },
        });

        const formatDuration = (connectedAt: number | null) => {
            if (!connectedAt) return activeCall.status;
            const totalSecs = Math.max(0, Math.floor((Date.now() - connectedAt) / 1000));
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        const updateNotification = () => {
            nativeCallNotificationService.showCallNotification({
                friendName: activeCall.friendName,
                callType: activeCall.callType,
                isMuted: Boolean(activeCall.isMuted),
                duration: formatDuration(activeCall.connectedAt),
            });
        };

        updateNotification();
        const interval = setInterval(updateNotification, 1000);

        nativeCallNotificationService.setupActionListener((action) => {
            if (action === 'toggleMute') {
                toggleMute();
            } else if (action === 'endCall') {
                endCall();
            }
        });

        return () => {
            clearInterval(interval);
            nativeCallNotificationService.removeActionListener();
            nativeCallNotificationService.removeAudioLifecycleListeners();
        };
    }, [isCallActive, activeCall, toggleMute, endCall, dispatch]);

    // Toggle Video Camera with reusable RTCRtpSender
    const toggleVideo = useCallback(async () => {
        const active = activeCallRef.current;
        if (!active || !peerConnectionRef.current) return;

        const currentVideoEnabled = active.isVideoEnabled;
        const nextVideoState = !currentVideoEnabled;

        const pc = peerConnectionRef.current;
        const senders = pc.getSenders();
        let videoSender = senders.find((s) => s.track && s.track.kind === 'video');

        if (!videoSender) {
            videoSender = senders.find((s) => s.track === null && (s as any).kind === 'video');
        }

        if (nextVideoState) {
            try {
                let videoTrack = localStreamRef.current?.getVideoTracks()[0];

                if (!videoTrack || videoTrack.readyState === 'ended') {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: active.facingMode || 'user' },
                        audio: false,
                    });
                    videoTrack = newStream.getVideoTracks()[0];
                    if (localStreamRef.current) {
                        localStreamRef.current.addTrack(videoTrack);
                    }
                }

                videoTrack.enabled = true;

                if (videoSender) {
                    await videoSender.replaceTrack(videoTrack);
                } else {
                    pc.addTrack(videoTrack, localStreamRef.current!);
                }

                dispatch(setCallVideoEnabled(true));
                dispatch(setCallType('video'));
                setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || []));

                sendToUser(active.friendId, 'direct_signal', {
                    callId: active.callId,
                    senderId: userId,
                    senderName: userName,
                    signalType: 'camera-toggle',
                    isVideoEnabled: true,
                });
            } catch (err) {
                console.warn('Failed to enable camera track:', err);
                dispatch(showToast({ message: getMediaAccessErrorMessage(err, 'camera'), type: 'error' }));
            }
        } else {
            // VIBE-BUG-006: Explicitly stop camera hardware sensor and release sender track
            const videoTracks = localStreamRef.current?.getVideoTracks() || [];
            videoTracks.forEach((t) => {
                try {
                    t.stop();
                    localStreamRef.current?.removeTrack(t);
                } catch (e) {
                    console.warn('Error stopping video track:', e);
                }
            });

            if (videoSender) {
                try {
                    await videoSender.replaceTrack(null);
                } catch (e) {
                    console.warn('Error replacing sender track with null:', e);
                }
            }

            dispatch(setCallVideoEnabled(false));
            // If remote video is also not active, downgrade callType to audio
            if (!active.isRemoteVideoEnabled) {
                dispatch(setCallType('audio'));
            }
            setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || []));

            sendToUser(active.friendId, 'direct_signal', {
                callId: active.callId,
                senderId: userId,
                senderName: userName,
                signalType: 'camera-toggle',
                isVideoEnabled: false,
            });
        }
    }, [userId, userName, dispatch, sendToUser]);

    // Flip Front / Rear Camera with replaceTrack
    const flipCamera = useCallback(async () => {
        const active = activeCallRef.current;
        if (!active || !peerConnectionRef.current || !active.isVideoEnabled) return;

        const currentFacing = active.facingMode || 'user';
        const nextFacing = currentFacing === 'user' ? 'environment' : 'user';

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: nextFacing } },
                audio: false,
            });
            const newVideoTrack = newStream.getVideoTracks()[0];

            const pc = peerConnectionRef.current;
            const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');

            if (videoSender) {
                const oldTrack = videoSender.track;
                await videoSender.replaceTrack(newVideoTrack);
                if (oldTrack) {
                    oldTrack.stop();
                    if (localStreamRef.current) {
                        localStreamRef.current.removeTrack(oldTrack);
                    }
                }
            }

            if (localStreamRef.current) {
                localStreamRef.current.addTrack(newVideoTrack);
            }

            setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || []));
            dispatch(setCallFacingMode(nextFacing));
        } catch (err) {
            console.warn('Exact camera flip failed, trying non-exact constraint:', err);
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: nextFacing },
                    audio: false,
                });
                const fallbackTrack = fallbackStream.getVideoTracks()[0];
                const pc = peerConnectionRef.current;
                const videoSender = pc?.getSenders().find((s) => s.track && s.track.kind === 'video');
                if (videoSender) {
                    const oldTrack = videoSender.track;
                    await videoSender.replaceTrack(fallbackTrack);
                    if (oldTrack) {
                        oldTrack.stop();
                        if (localStreamRef.current) {
                            localStreamRef.current.removeTrack(oldTrack);
                        }
                    }
                }
                if (localStreamRef.current) {
                    localStreamRef.current.addTrack(fallbackTrack);
                }
                setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || []));
                dispatch(setCallFacingMode(nextFacing));
            } catch (e2) {
                console.warn('Fallback camera flip failed:', e2);
                dispatch(showToast({ message: getMediaAccessErrorMessage(e2, 'camera'), type: 'info' }));
            }
        }
    }, [dispatch]);

    // Toggle Speaker Output
    const toggleSpeaker = useCallback(async () => {
        const isSpeakerOn = activeCallRef.current?.isSpeakerOn ?? false;
        const nextState = !isSpeakerOn;

        const nativeHandled = await nativeCallNotificationService.setSpeakerphoneOn(nextState);
        if (!nativeHandled) {
            try {
                if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const outputs = devices.filter((device) => device.kind === 'audiooutput');
                    const target = nextState
                        ? outputs.find((device) => device.deviceId !== 'default')
                        : outputs.find((device) => device.deviceId === 'default');
                    if (target) {
                        const routed = await persistentAudioManager.setSinkId(target.deviceId);
                        if (!routed) dispatch(showToast({ message: 'This browser does not support audio output switching.', type: 'info' }));
                    }
                }
            } catch (error) {
                console.warn('[WebRTC] Audio output selection is unavailable:', error);
                dispatch(showToast({ message: 'Audio output switching is unavailable on this device.', type: 'info' }));
            }
        }
        dispatch(setCallSpeakerOn(nextState));
    }, [dispatch]);

    // Add friend locally
    const addNewFriend = useCallback(async (friendId: string, name: string) => {
        const friend: Friend = { id: friendId, name, addedAt: Date.now() };
        await saveFriendLocal(friend);
        const list = await getFriendsLocal();
        dispatch(setFriendsList(list));
    }, [dispatch]);

    const contextValue: DirectCommunicationContextValue = {
        sendDirectMessage,
        callFriend,
        acceptIncomingCall,
        declineIncomingCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        flipCamera,
        addNewFriend,
        userId,
        localStream,
        remoteStream,
    };

    return (
        <DirectCommunicationContext.Provider value={contextValue}>
            {children}
        </DirectCommunicationContext.Provider>
    );
};

export const useDirectCommunication = (): DirectCommunicationContextValue => {
    const context = useContext(DirectCommunicationContext);
    if (!context) {
        throw new Error('useDirectCommunication must be used within a DirectCommunicationProvider');
    }
    return context;
};
