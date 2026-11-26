import { describe, it, expect } from 'vitest';
import friendsReducer, {
    startDirectCall,
    updateCallStatus,
    setCallMuted,
    setCallVideoEnabled,
    setCallSpeakerOn,
    endDirectCall,
    setDirectMessages,
    removeDirectMessage,
    setWaitingCall,
    promoteWaitingCall,
    setCallQuality,
} from './friendsSlice';
import uiReducer, { setMobileNavItems, resetMobileNavItems } from '../ui/uiSlice';

describe('friendsSlice Conversation History', () => {
    it('removes one message without changing other conversations', () => {
        const initialState = friendsReducer(undefined, { type: 'unknown' });
        const withMessages = friendsReducer(initialState, setDirectMessages({
            friendId: 'friend-a',
            messages: [
                { id: 'message-1', friendId: 'friend-a', senderId: 'me', senderName: 'Me', text: 'Keep', timestamp: 1 },
                { id: 'message-2', friendId: 'friend-a', senderId: 'friend-a', senderName: 'Friend', text: 'Delete', timestamp: 2 },
            ],
        }));
        const withOtherConversation = friendsReducer(withMessages, setDirectMessages({
            friendId: 'friend-b',
            messages: [
                { id: 'message-3', friendId: 'friend-b', senderId: 'friend-b', senderName: 'Other', text: 'Untouched', timestamp: 3 },
            ],
        }));

        const updated = friendsReducer(withOtherConversation, removeDirectMessage({
            friendId: 'friend-a',
            messageId: 'message-2',
        }));

        expect(updated.directMessages['friend-a'].map((message) => message.id)).toEqual(['message-1']);
        expect(updated.directMessages['friend-b'].map((message) => message.id)).toEqual(['message-3']);
    });
});

describe('friendsSlice Call Waiting and Quality', () => {
    it('queues one waiting call and promotes it after the active call ends', () => {
        let state = friendsReducer(undefined, startDirectCall({
            callId: 'active-call',
            friendId: 'friend-a',
            friendName: 'Alice',
            callType: 'audio',
            isIncoming: false,
        }));
        state = friendsReducer(state, setWaitingCall({
            callId: 'waiting-call',
            callerId: 'friend-b',
            callerName: 'Bob',
            channelName: 'user:me',
            callType: 'video',
            receivedAt: 10,
        }));

        expect(state.activeCall?.callId).toBe('active-call');
        expect(state.waitingCall?.callId).toBe('waiting-call');
        expect(state.incomingCall).toBeNull();

        state = friendsReducer(state, endDirectCall({ callId: 'active-call' }));
        state = friendsReducer(state, promoteWaitingCall());

        expect(state.isCallActive).toBe(false);
        expect(state.incomingCall?.callId).toBe('waiting-call');
        expect(state.waitingCall).toBeNull();
    });

    it('stores and clears connection quality independently of call state', () => {
        let state = friendsReducer(undefined, setCallQuality({
            level: 'fair',
            rttMs: 280,
            jitterMs: 20,
            packetLossPercent: 1.5,
            bitrateKbps: 64,
            sampledAt: 100,
        }));
        expect(state.callQuality?.level).toBe('fair');
        state = friendsReducer(state, setCallQuality(null));
        expect(state.callQuality).toBeNull();
    });
});

describe('friendsSlice Call State Machine', () => {
    const initial = friendsReducer(undefined, { type: 'unknown' });

    it('should initialize with idle call state', () => {
        expect(initial.isCallActive).toBe(false);
        expect(initial.activeCall).toBeNull();
    });

    it('should transition to ringing/connecting on startDirectCall with unique callId', () => {
        const state = friendsReducer(
            initial,
            startDirectCall({
                callId: 'call-xyz-123',
                friendId: 'user-123',
                friendName: 'Alice',
                callType: 'video',
                isIncoming: false,
            })
        );
        expect(state.isCallActive).toBe(true);
        expect(state.activeCall?.callId).toBe('call-xyz-123');
        expect(state.activeCall?.friendId).toBe('user-123');
        expect(state.activeCall?.callType).toBe('video');
        expect(state.activeCall?.status).toBe('ringing');
    });

    it('should enforce callId correlation on updateCallStatus and endDirectCall', () => {
        let state = friendsReducer(
            initial,
            startDirectCall({
                callId: 'call-abc',
                friendId: 'user-123',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: true,
            })
        );

        // Mismatched callId should be ignored
        state = friendsReducer(state, updateCallStatus({ status: 'connected', callId: 'wrong-call-id' }));
        expect(state.activeCall?.status).toBe('connecting');

        // Matching callId should update status
        state = friendsReducer(state, updateCallStatus({ status: 'connected', callId: 'call-abc' }));
        expect(state.activeCall?.status).toBe('connected');

        // Mismatched callId should not end the active call
        state = friendsReducer(state, endDirectCall({ callId: 'stale-call-id' }));
        expect(state.isCallActive).toBe(true);

        // Matching callId should end the call
        state = friendsReducer(state, endDirectCall({ callId: 'call-abc' }));
        expect(state.isCallActive).toBe(false);
        expect(state.activeCall).toBeNull();
    });

    it('should update status and toggle media controls', () => {
        let state = friendsReducer(
            initial,
            startDirectCall({
                friendId: 'user-123',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: true,
            })
        );
        state = friendsReducer(state, updateCallStatus('connected'));
        expect(state.activeCall?.status).toBe('connected');
        expect(state.activeCall?.connectedAt).toBeGreaterThan(0);

        state = friendsReducer(state, setCallMuted(true));
        expect(state.activeCall?.isMuted).toBe(true);

        state = friendsReducer(state, setCallSpeakerOn(true));
        expect(state.activeCall?.isSpeakerOn).toBe(true);

        state = friendsReducer(state, endDirectCall());
        expect(state.isCallActive).toBe(false);
        expect(state.activeCall).toBeNull();
    });
});

describe('uiSlice Navigation Reordering', () => {
    it('should allow reordering navigation items and restoring defaults', () => {
        const initialUi = uiReducer(undefined, { type: 'unknown' });
        const originalOrder = [...initialUi.mobileNavItems];
        const newOrder = [originalOrder[1], originalOrder[0], ...originalOrder.slice(2)];

        const updated = uiReducer(initialUi, setMobileNavItems(newOrder));
        expect(updated.mobileNavItems).toEqual(newOrder);

        const reset = uiReducer(updated, resetMobileNavItems());
        expect(reset.mobileNavItems).toEqual(originalOrder);
    });
});
