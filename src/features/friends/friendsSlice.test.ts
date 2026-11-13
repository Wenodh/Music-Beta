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
