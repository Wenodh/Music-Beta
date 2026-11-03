import { describe, it, expect } from 'vitest';
import friendsReducer, {
    startDirectCall,
    updateCallStatus,
    setCallMuted,
    setCallVideoEnabled,
    setCallSpeakerOn,
    endDirectCall,
} from './friendsSlice';
import uiReducer, { setMobileNavItems, resetMobileNavItems } from '../ui/uiSlice';

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
