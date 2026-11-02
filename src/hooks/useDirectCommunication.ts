import { useEffect, useRef, useCallback } from 'react';
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
    endDirectCall,
    toggleDirectMute,
} from '../features/friends/friendsSlice';
import {
    getFriendsLocal,
    saveFriendLocal,
    getDirectMessagesLocal,
    saveDirectMessageLocal,
    updateDirectMessageStatusLocal,
    updateDirectMessagesStatusByFriendLocal,
    Friend,
    DirectMessage,
} from '../utils/friendsDb';

export const useDirectCommunication = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { friendsList, activeFriendId, isCallActive, activeCallFriend } = useAppSelector(
        (state) => state.friends
    );

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
    const activeFriendIdRef = useRef<string | null>(activeFriendId);
    activeFriendIdRef.current = activeFriendId;

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
                // Send seen receipt to friend for all their incoming messages
                sendToUser(activeFriendId, 'message_seen', {
                    senderId: userId,
                    timestamp: Date.now(),
                });
            });
        }
    }, [activeFriendId, dispatch, sendToUser, userId]);

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
                sendToUser(targetId, 'direct_signal', {
                    senderId: userId,
                    senderName: userName,
                    signalType: 'ice-candidate',
                    candidate: event.candidate,
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
    }, [userId, userName, sendToUser]);

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
                // Automatically ensure sender is added to receiver's contacts so it immediately shows up
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

                // Check if recipient currently has chat open with this sender
                const isCurrentlyChatting = activeFriendIdRef.current === incomingMsg.senderId;
                const statusOnReceipt = isCurrentlyChatting ? 'seen' : 'delivered';

                // Save locally mapped to the conversation with senderId
                const localMsg: DirectMessage = {
                    ...incomingMsg,
                    friendId: incomingMsg.senderId, // for the recipient, the conversation is with senderId
                    status: statusOnReceipt,
                };
                await saveDirectMessageLocal(localMsg);
                dispatch(addDirectMessage(localMsg));

                // Send Delivery / Seen receipt back to sender
                sendToUser(incomingMsg.senderId, isCurrentlyChatting ? 'message_seen' : 'message_ack', {
                    messageId: incomingMsg.id,
                    senderId: userId, // this is the reader/receiver's userId
                    timestamp: Date.now(),
                });
            })
            .on('broadcast', { event: 'message_ack' }, async ({ payload }) => {
                const { messageId, senderId } = payload; // senderId here is the friend who received the message
                await updateDirectMessageStatusLocal(messageId, 'delivered');
                dispatch(updateMessageStatus({ friendId: senderId, messageId, status: 'delivered' }));
            })
            .on('broadcast', { event: 'message_seen' }, async ({ payload }) => {
                const { messageId, senderId } = payload; // senderId here is the friend who saw the message
                if (messageId) {
                    await updateDirectMessageStatusLocal(messageId, 'seen');
                    dispatch(updateMessageStatus({ friendId: senderId, messageId, status: 'seen' }));
                } else if (senderId) {
                    await updateDirectMessagesStatusByFriendLocal(senderId, 'seen');
                    dispatch(markFriendMessagesSeen({ friendId: senderId }));
                }
            })
            .on('broadcast', { event: 'direct_signal' }, async ({ payload }) => {
                const { senderId, senderName, signalType, sdp, candidate } = payload;

                if (signalType === 'call-request') {
                    // Automatically add caller to friends if not yet saved
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

                    // Trigger incoming call modal
                    dispatch(
                        setIncomingCall({
                            callerId: senderId,
                            callerName: senderName || 'Friend',
                            channelName: `user:${userId}`,
                        })
                    );
                } else if (signalType === 'call-accepted') {
                    // Caller gets acceptance, creates WebRTC Offer
                    const pc = getOrCreatePeerConnection(senderId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    sendToUser(senderId, 'direct_signal', {
                        senderId: userId,
                        senderName: userName,
                        signalType: 'offer',
                        sdp: offer,
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

                    sendToUser(senderId, 'direct_signal', {
                        senderId: userId,
                        senderName: userName,
                        signalType: 'answer',
                        sdp: answer,
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
    }, [userId, userName, dispatch, getOrCreatePeerConnection, sendToUser]);

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

        // Transmit via recipient's personal channel
        sendToUser(friendId, 'direct_message', msg);
    }, [userId, userName, dispatch, sendToUser]);

    // Start 1-click call to a friend
    const callFriend = useCallback(async (friend: Friend) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            dispatch(startDirectCall(friend));

            sendToUser(friend.id, 'direct_signal', {
                senderId: userId,
                senderName: userName,
                signalType: 'call-request',
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

            sendToUser(callerId, 'direct_signal', {
                senderId: userId,
                senderName: userName,
                signalType: 'call-accepted',
            });
        } catch (err) {
            console.error('Failed to accept call microphone stream:', err);
        }
    }, [userId, userName, dispatch]);

    // Decline incoming call
    const declineIncomingCall = useCallback((callerId: string) => {
        dispatch(setIncomingCall(null));
        sendToUser(callerId, 'direct_signal', {
            senderId: userId,
            senderName: userName,
            signalType: 'call-declined',
        });
    }, [userId, userName, dispatch, sendToUser]);

    // End current call
    const endCall = useCallback(() => {
        if (activeCallFriend) {
            sendToUser(activeCallFriend.id, 'direct_signal', {
                senderId: userId,
                senderName: userName,
                signalType: 'call-ended',
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
