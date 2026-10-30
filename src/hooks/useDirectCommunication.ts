import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    setFriendsList,
    addDirectMessage,
    setIncomingCall,
    startDirectCall,
    endDirectCall,
    toggleDirectMute,
} from '../features/friends/friendsSlice';
import {
    getFriendsLocal,
    saveFriendLocal,
    getDirectMessagesLocal,
    saveDirectMessageLocal,
    Friend,
    DirectMessage,
} from '../utils/friendsDb';

export const useDirectCommunication = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { friendsList, activeFriendId, isCallActive, activeCallFriend } = useAppSelector(
        (state) => state.friends
    );

    const anonymousId = useRef(`anon-${Math.random().toString(36).substring(2, 9)}`).current;
    const userId = user?.id || anonymousId;
    const userName = user?.user_metadata?.full_name || 'Vibe User';

    const personalChannelRef = useRef<RealtimeChannel | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // Initial load of local friends
    useEffect(() => {
        getFriendsLocal().then((list) => {
            dispatch(setFriendsList(list));
        });
    }, [dispatch]);

    // Initial load of messages when active friend changes
    useEffect(() => {
        if (activeFriendId) {
            getDirectMessagesLocal(activeFriendId).then((messages) => {
                dispatch({
                    type: 'friends/setDirectMessages',
                    payload: { friendId: activeFriendId, messages },
                });
            });
        }
    }, [activeFriendId, dispatch]);

    // Setup RTCPeerConnection instance helper
    const getOrCreatePeerConnection = useCallback((targetId: string) => {
        if (peerConnectionRef.current) return peerConnectionRef.current;

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                supabase.channel(`user:${targetId}`).send({
                    type: 'broadcast',
                    event: 'direct_signal',
                    payload: {
                        senderId: userId,
                        senderName: userName,
                        signalType: 'ice-candidate',
                        candidate: event.candidate,
                    },
                });
            }
        };

        pc.ontrack = (event) => {
            const remoteAudio = new Audio();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch((e) => console.warn('Remote audio stream error:', e));
        };

        peerConnectionRef.current = pc;
        return pc;
    }, [userId, userName]);

    // Main signaling listener on personal channel
    useEffect(() => {
        const channelName = `user:${userId}`;
        const channel = supabase.channel(channelName);

        channel
            .on('broadcast', { event: 'direct_message' }, async ({ payload }) => {
                const msg: DirectMessage = payload;
                await saveDirectMessageLocal(msg);
                dispatch(addDirectMessage(msg));
            })
            .on('broadcast', { event: 'direct_signal' }, async ({ payload }) => {
                const { senderId, senderName, signalType, sdp, candidate } = payload;

                if (signalType === 'call-request') {
                    // Trigger incoming call modal
                    dispatch(
                        setIncomingCall({
                            callerId: senderId,
                            callerName,
                            channelName: `user:${userId}`,
                        })
                    );
                } else if (signalType === 'call-accepted') {
                    // Caller gets acceptance, creates WebRTC Offer
                    const pc = getOrCreatePeerConnection(senderId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    supabase.channel(`user:${senderId}`).send({
                        type: 'broadcast',
                        event: 'direct_signal',
                        payload: {
                            senderId: userId,
                            senderName: userName,
                            signalType: 'offer',
                            sdp: offer,
                        },
                    });
                } else if (signalType === 'call-declined' || signalType === 'call-ended') {
                    if (localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach((t) => t.stop());
                        localStreamRef.current = null;
                    }
                    if (peerConnectionRef.current) {
                        peerConnectionRef.current.close();
                        peerConnectionRef.current = null;
                    }
                    dispatch(endDirectCall());
                } else if (signalType === 'offer') {
                    const pc = getOrCreatePeerConnection(senderId);
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    supabase.channel(`user:${senderId}`).send({
                        type: 'broadcast',
                        event: 'direct_signal',
                        payload: {
                            senderId: userId,
                            senderName: userName,
                            signalType: 'answer',
                            sdp: answer,
                        },
                    });
                } else if (signalType === 'answer') {
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(
                            new RTCSessionDescription(sdp)
                        );
                    }
                } else if (signalType === 'ice-candidate') {
                    if (peerConnectionRef.current && candidate) {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                }
            })
            .subscribe();

        personalChannelRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [userId, userName, dispatch, getOrCreatePeerConnection]);

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
        };

        await saveDirectMessageLocal(msg);
        dispatch(addDirectMessage(msg));

        // Transmit via recipient's personal channel
        supabase.channel(`user:${friendId}`).send({
            type: 'broadcast',
            event: 'direct_message',
            payload: msg,
        });
    }, [userId, userName, dispatch]);

    // Start 1-click call to a friend
    const callFriend = useCallback(async (friend: Friend) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            dispatch(startDirectCall(friend));

            supabase.channel(`user:${friend.id}`).send({
                type: 'broadcast',
                event: 'direct_signal',
                payload: {
                    senderId: userId,
                    senderName: userName,
                    signalType: 'call-request',
                },
            });
        } catch (err) {
            console.error('Failed to get microphone:', err);
        }
    }, [userId, userName, dispatch]);

    // Accept incoming call
    const acceptIncomingCall = useCallback(async (callerId: string, callerName: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const friendObj: Friend = {
                id: callerId,
                name: callerName,
                addedAt: Date.now(),
            };

            await saveFriendLocal(friendObj);
            dispatch(startDirectCall(friendObj));

            supabase.channel(`user:${callerId}`).send({
                type: 'broadcast',
                event: 'direct_signal',
                payload: {
                    senderId: userId,
                    senderName: userName,
                    signalType: 'call-accepted',
                },
            });
        } catch (err) {
            console.error('Failed to accept call microphone stream:', err);
        }
    }, [userId, userName, dispatch]);

    // Decline incoming call
    const declineIncomingCall = useCallback((callerId: string) => {
        dispatch(setIncomingCall(null));
        supabase.channel(`user:${callerId}`).send({
            type: 'broadcast',
            event: 'direct_signal',
            payload: {
                senderId: userId,
                senderName: userName,
                signalType: 'call-declined',
            },
        });
    }, [userId, userName, dispatch]);

    // End current call
    const endCall = useCallback(() => {
        if (activeCallFriend) {
            supabase.channel(`user:${activeCallFriend.id}`).send({
                type: 'broadcast',
                event: 'direct_signal',
                payload: {
                    senderId: userId,
                    senderName: userName,
                    signalType: 'call-ended',
                },
            });
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        dispatch(endDirectCall());
    }, [activeCallFriend, userId, userName, dispatch]);

    // Add friend locally
    const addNewFriend = useCallback(async (friendId: string, name: string) => {
        const friend: Friend = { id: friendId, name, addedAt: Date.now() };
        await saveFriendLocal(friend);
        const list = await getFriendsLocal();
        dispatch(setFriendsList(list));
    }, [dispatch]);

    return {
        sendDirectMessage,
        callFriend,
        acceptIncomingCall,
        declineIncomingCall,
        endCall,
        addNewFriend,
        userId,
    };
};
