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

    it('should transition to ringing/connecting on startDirectCall', () => {
        const state = friendsReducer(
            initial,
            startDirectCall({
                friendId: 'user-123',
                friendName: 'Alice',
                callType: 'video',
                isIncoming: false,
            })
        );
        expect(state.isCallActive).toBe(true);
        expect(state.activeCall?.friendId).toBe('user-123');
        expect(state.activeCall?.callType).toBe('video');
        expect(state.activeCall?.status).toBe('ringing');
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
