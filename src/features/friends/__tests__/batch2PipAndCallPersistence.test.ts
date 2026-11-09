// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import friendsReducer, {
    startDirectCall,
    updateCallStatus,
    setIsCallScreenExpanded,
    endDirectCall,
} from '../friendsSlice';

describe('Batch 2: Persistent In-Call UI & In-App Video PiP State', () => {
    it('minimizing active call switches isCallScreenExpanded to false while keeping call active', () => {
        let state = friendsReducer(undefined, startDirectCall({
            callId: 'call-pip-1',
            friendId: 'user-bob',
            friendName: 'Bob',
            callType: 'video',
            isIncoming: false,
        }));

        expect(state.isCallActive).toBe(true);
        expect(state.isCallScreenExpanded).toBe(true);

        // User navigates away or taps minimize
        state = friendsReducer(state, setIsCallScreenExpanded(false));
        expect(state.isCallActive).toBe(true);
        expect(state.isCallScreenExpanded).toBe(false);

        // Connecting/connected status maintains minimization
        state = friendsReducer(state, updateCallStatus({ status: 'connected', callId: 'call-pip-1' }));
        expect(state.isCallActive).toBe(true);
        expect(state.isCallScreenExpanded).toBe(false);

        // Tap maximize restores full-screen call modal
        state = friendsReducer(state, setIsCallScreenExpanded(true));
        expect(state.isCallScreenExpanded).toBe(true);

        // End call cleanly cleans up state
        state = friendsReducer(state, endDirectCall({ callId: 'call-pip-1' }));
        expect(state.isCallActive).toBe(false);
        expect(state.activeCall).toBeNull();
    });
});
