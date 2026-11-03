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
    startDirectCall,
    updateCallStatus,
    setCallMuted,
    setCallVideoEnabled,
    setRemoteVideoEnabled,
    setCallFacingMode,
    setCallSpeakerOn,
    endDirectCall,
} from '../features/friends/friendsSlice';
import { CallType } from '../types/call';
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
    saveCallLogLocal,
    Friend,
    DirectMessage,
    CallLogEntry,
} from '../utils/friendsDb';

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
    const { friendsList, activeFriendId, isCallActive, activeCallFriend, activeCall, incomingCall, isMuted } = useAppSelector(
        (state) => state.friends
    );

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const getPersistentAnonymousId = (): string => {
        try {
            const stored = localStorage.getItem('vibeon_user_code');
            if (stored && stored.startsWith('anon-')) {
                return stored;
            }
            const generated = `anon-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('vibeon_user_code', generated);
            return generated;
        } catch {
            return `anon-${Math.random().toString(36).substring(2, 9)}`;
        }
    };

    const anonymousId = useRef(getPersistentAnonymousId()).current;
    const userId = user?.id || anonymousId;
    const userName = user?.user_metadata?.full_name || 'Vibe User';

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
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

    // Call state refs for thread-safe access in closures & event callbacks
    const activeCallRef = useRef(activeCall);
    activeCallRef.current = activeCall;

    const incomingCallRef = useRef(incomingCall);
    incomingCallRef.current = incomingCall;

    const isCallActiveRef = useRef(isCallActive);
    isCallActiveRef.current = isCallActive;

    const ringingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // Helper to send message or signal via recipient channel with assured connection
    const sendToUser = useCallback(async (targetUserId: string, event: string, payload: any) => {
        const targetChannelName = `user:${targetUserId}`;
        let targetChannel = supabase.getChannels().find(ch => ch.topic === `realtime:${targetChannelName}` || ch.topic === targetChannelName);
        if (!targetChannel) {
            targetChannel = supabase.channel(targetChannelName);
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
            await targetChannel.send({
                type: 'broadcast',
                event,
                payload,
            });
        } catch (e) {
            console.warn(`Error sending ${event} to ${targetUserId}:`, e);
        }
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

    // Idempotent resource cleanup with Call History logging
    const cleanupCallResources = useCallback((targetCallId?: string, outcomeOverride?: 'connected' | 'missed' | 'declined' | 'busy' | 'cancelled') => {
        clearTimers();

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
                peerConnectionRef.current.onnegotiationneeded = null;
                peerConnectionRef.current.close();
            } catch (e) {
                console.warn('Error closing peer connection:', e);
            }
            peerConnectionRef.current = null;
        }

        dispatch(endDirectCall(targetCallId ? { callId: targetCallId } : undefined));
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
            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                remoteStreamRef.current = stream;
                setRemoteStream(stream);

                // Handle audio routing
                if (event.track.kind === 'audio') {
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
            }
        };

        pc.oniceconnectionstatechange = async () => {
            const state = pc.iceConnectionState;
            if (state === 'connected' || state === 'completed') {
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
                dispatch(updateCallStatus({ status: 'connected', callId: currentCallId }));
            } else if (state === 'disconnected') {
                dispatch(updateCallStatus({ status: 'reconnecting', callId: currentCallId }));
                // Attempt ICE restart if disconnected persists
                if (!reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = setTimeout(async () => {
                        if (pc.iceConnectionState === 'disconnected') {
                            try {
                                if ('restartIce' in pc && typeof (pc as any).restartIce === 'function') {
                                    (pc as any).restartIce();
                                    const offer = await pc.createOffer({ iceRestart: true });
                                    await pc.setLocalDescription(offer);
                                    sendToUser(targetId, 'direct_signal', {
                                        callId: currentCallId,
                                        senderId: userId,
                                        senderName: userName,
                                        signalType: 'offer',
                                        sdp: pc.localDescription,
                                    });
                                }
                            } catch (e) {
                                console.warn('ICE restart attempt error:', e);
                            }
                        }
                    }, 5000);
                }
            } else if (state === 'failed') {
                dispatch(showToast({ message: 'Call disconnected due to network failure', type: 'error' }));
                cleanupCallResources(currentCallId);
            } else if (state === 'closed') {
                cleanupCallResources(currentCallId);
            }
        };

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
                const incomingMsg: DirectMessage = payload;
                const currentFriends = await getFriendsLocal();
                if (!currentFriends.some((f) => f.id === incomingMsg.senderId)) {
                    const newContact: Friend = {
                        id: incomingMsg.senderId,
                        name: incomingMsg.senderName || 'Friend',
                        addedAt: Date.now(),
                    };
                    await saveFriendLocal(newContact);
                    const updated = await getFriendsLocal();
                    dispatch(setFriendsList(updated));
                }

                const isCurrentlyChatting = activeFriendIdRef.current === incomingMsg.senderId;
                const statusOnReceipt = isCurrentlyChatting ? 'seen' : 'delivered';

                const localMsg: DirectMessage = {
                    ...incomingMsg,
                    friendId: incomingMsg.senderId,
                    status: statusOnReceipt,
                };
                await saveDirectMessageLocal(localMsg);
                dispatch(addDirectMessage(localMsg));

                sendToUser(incomingMsg.senderId, isCurrentlyChatting ? 'message_seen' : 'message_ack', {
                    messageId: incomingMsg.id,
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
                const { callId, senderId, senderName, signalType, sdp, candidate, callType = 'audio' } = payload;

                if (!senderId || !signalType) return;

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
                        sendToUser(senderId, 'direct_signal', {
                            callId,
                            senderId: userId,
                            senderName: userName,
                            signalType: 'call-busy',
                        });
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

                    dispatch(
                        setIncomingCall({
                            callId: callId || `call-${Date.now()}`,
                            callerId: senderId,
                            callerName: senderName || 'Friend',
                            channelName: `user:${userId}`,
                            callType,
                            receivedAt: Date.now(),
                        })
                    );
                    return;
                }

                const activeId = activeCallRef.current?.callId;
                const incomingId = incomingCallRef.current?.callId;

                if (signalType === 'call-cancelled') {
                    if (incomingId === callId || (!incomingId && !activeId)) {
                        dispatch(setIncomingCall(null));
                        dispatch(showToast({ message: `${senderName || 'Caller'} cancelled the call` }));
                    }
                    return;
                }

                if (signalType === 'call-busy') {
                    if (activeId === callId) {
                        dispatch(showToast({ message: `${senderName || 'Contact'} is busy on another call`, type: 'info' }));
                        cleanupCallResources(callId);
                    }
                    return;
                }

                if (signalType === 'call-declined') {
                    if (activeId === callId) {
                        dispatch(showToast({ message: `${senderName || 'Contact'} declined the call` }));
                        cleanupCallResources(callId);
                    }
                    return;
                }

                if (signalType === 'call-ended') {
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

                // Handle WebRTC Offer with Perfect Negotiation glare resolution
                if (signalType === 'offer') {
                    if (activeId !== callId) return;

                    clearTimers();
                    const pc = getOrCreatePeerConnection(senderId, callId);

                    const readyForOffer = !makingOfferRef.current &&
                        (pc.signalingState === 'stable' || isSettingRemoteAnswerPendingRef.current);
                    const offerCollision = !readyForOffer;

                    ignoreOfferRef.current = !isPolitePeerRef.current && offerCollision;
                    if (ignoreOfferRef.current) {
                        console.info('[WebRTC Perfect Negotiation] Glare detected: impolite peer ignoring incoming offer');
                        return;
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

                // Handle remote camera toggle notification
                if (signalType === 'camera-toggle') {
                    if (activeId === callId) {
                        const isVideoOn = Boolean(payload.isVideoEnabled);
                        dispatch(setRemoteVideoEnabled(isVideoOn));
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
    }, [userId, userName, dispatch, getOrCreatePeerConnection, sendToUser, cleanupCallResources, clearTimers]);

    // Send 1-on-1 direct message
    const sendDirectMessage = useCallback(async (friendId: string, text: string) => {
        if (!text.trim()) return;

        const msg: DirectMessage = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            friendId,
            senderId: userId,
            senderName: userName,
            text: text.trim(),
            timestamp: Date.now(),
            status: 'sent',
        };

        await saveDirectMessageLocal(msg);
        dispatch(addDirectMessage(msg));

        sendToUser(friendId, 'direct_message', msg);
    }, [userId, userName, dispatch, sendToUser]);

    // Acquire media stream with camera fallback
    const acquireMediaStream = async (requestedCallType: CallType): Promise<{ stream: MediaStream; hasVideo: boolean }> => {
        if (requestedCallType === 'video') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                });
                return { stream, hasVideo: true };
            } catch (err) {
                console.warn('Video access denied/failed, falling back to audio only:', err);
                dispatch(showToast({ message: 'Camera unavailable. Proceeding with voice only.', type: 'info' }));
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                return { stream: audioStream, hasVideo: false };
            }
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            return { stream, hasVideo: false };
        }
    };

    // Start 1-click call to a friend (supports audio and video)
    const callFriend = useCallback(async (friend: Friend, requestedCallType: CallType = 'audio') => {
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

            sendToUser(friend.id, 'direct_signal', {
                callId: newCallId,
                senderId: userId,
                senderName: userName,
                signalType: 'call-request',
                callType: requestedCallType,
            });

            clearTimers();
            ringingTimeoutRef.current = setTimeout(() => {
                if (activeCallRef.current?.status === 'ringing' && activeCallRef.current.callId === newCallId) {
                    dispatch(showToast({ message: 'No answer', type: 'info' }));
                    sendToUser(friend.id, 'direct_signal', {
                        callId: newCallId,
                        senderId: userId,
                        senderName: userName,
                        signalType: 'call-cancelled',
                    });
                    cleanupCallResources(newCallId);
                }
            }, 45000);
        } catch (err) {
            console.error('Failed to get media stream:', err);
            dispatch(showToast({ message: 'Microphone permission denied or device unavailable', type: 'error' }));
        }
    }, [userId, userName, dispatch, sendToUser, clearTimers, cleanupCallResources]);

    // Accept incoming call (supports audio and video)
    const acceptIncomingCall = useCallback(async (callerId: string, callerName: string) => {
        const incoming = incomingCallRef.current;
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
        const incoming = incomingCallRef.current;
        const currentCallId = incoming?.callId;

        dispatch(setIncomingCall(null));
        sendToUser(callerId, 'direct_signal', {
            callId: currentCallId,
            senderId: userId,
            senderName: userName,
            signalType: 'call-declined',
        });
    }, [userId, userName, dispatch, sendToUser]);

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
                dispatch(showToast({ message: 'Could not access camera', type: 'error' }));
            }
        } else {
            const videoTracks = localStreamRef.current?.getVideoTracks() || [];
            videoTracks.forEach((t) => {
                t.enabled = false;
            });

            dispatch(setCallVideoEnabled(false));
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
                dispatch(showToast({ message: 'Secondary camera not found on device', type: 'info' }));
            }
        }
    }, [dispatch]);

    // Toggle Speaker Output
    const toggleSpeaker = useCallback(async () => {
        const isSpeakerOn = activeCallRef.current?.isSpeakerOn ?? false;
        const nextState = !isSpeakerOn;

        try {
            if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
                if (audioOutputs.length > 1) {
                    const targetDevice = nextState ? audioOutputs[audioOutputs.length - 1] : audioOutputs[0];
                    await persistentAudioManager.setSinkId(targetDevice.deviceId);
                }
            }
        } catch (e) {
            console.warn('Speaker device selection not fully supported by platform:', e);
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
