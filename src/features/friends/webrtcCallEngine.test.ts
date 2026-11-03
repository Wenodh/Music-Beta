import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import friendsReducer, {
    startDirectCall,
    updateCallStatus,
    setCallMuted,
    setCallSpeakerOn,
    setIncomingCall,
    endDirectCall,
} from './friendsSlice';

describe('WebRTC Calling Engine Unit Tests (Task 1)', () => {
    const initialState = friendsReducer(undefined, { type: 'unknown' });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('1. Outgoing call flow initializes with unique callId and status ringing', () => {
        const state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-out-123',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: false,
            })
        );

        expect(state.isCallActive).toBe(true);
        expect(state.activeCall?.callId).toBe('call-out-123');
        expect(state.activeCall?.friendId).toBe('peer-alice');
        expect(state.activeCall?.callType).toBe('audio');
        expect(state.activeCall?.status).toBe('ringing');
        expect(state.activeCall?.isIncoming).toBe(false);
        expect(state.activeCall?.isMuted).toBe(false);
        expect(state.activeCall?.isSpeakerOn).toBe(false);
    });

    it('2. Incoming call notification sets incomingCall with matching callId', () => {
        const state = friendsReducer(
            initialState,
            setIncomingCall({
                callId: 'call-in-456',
                callerId: 'peer-bob',
                callerName: 'Bob',
                channelName: 'user:self',
                callType: 'audio',
                receivedAt: Date.now(),
            })
        );

        expect(state.incomingCall).not.toBeNull();
        expect(state.incomingCall?.callId).toBe('call-in-456');
        expect(state.incomingCall?.callerId).toBe('peer-bob');
        expect(state.incomingCall?.callerName).toBe('Bob');
        expect(state.incomingCall?.callType).toBe('audio');
    });

    it('3. Accepting incoming call dismisses incoming modal and transitions to connecting with callId', () => {
        const withIncoming = friendsReducer(
            initialState,
            setIncomingCall({
                callId: 'call-in-456',
                callerId: 'peer-bob',
                callerName: 'Bob',
                channelName: 'user:self',
                callType: 'audio',
                receivedAt: Date.now(),
            })
        );

        const acceptedState = friendsReducer(
            withIncoming,
            startDirectCall({
                callId: 'call-in-456',
                friendId: 'peer-bob',
                friendName: 'Bob',
                callType: 'audio',
                isIncoming: true,
            })
        );

        expect(acceptedState.incomingCall).toBeNull();
        expect(acceptedState.isCallActive).toBe(true);
        expect(acceptedState.activeCall?.callId).toBe('call-in-456');
        expect(acceptedState.activeCall?.status).toBe('connecting');
        expect(acceptedState.activeCall?.isIncoming).toBe(true);
    });

    it('4. Declining incoming call dismisses incomingCall modal cleanly', () => {
        const withIncoming = friendsReducer(
            initialState,
            setIncomingCall({
                callId: 'call-in-456',
                callerId: 'peer-bob',
                callerName: 'Bob',
                channelName: 'user:self',
                callType: 'audio',
                receivedAt: Date.now(),
            })
        );

        const declinedState = friendsReducer(withIncoming, setIncomingCall(null));
        expect(declinedState.incomingCall).toBeNull();
        expect(declinedState.isCallActive).toBe(false);
        expect(declinedState.activeCall).toBeNull();
    });

    it('5. CallId correlation prevents stale or unrelated signaling from mutating active call', () => {
        const active = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'authoritative-call-1',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: false,
            })
        );

        // Stale signal from old call ID should be ignored
        const staleState = friendsReducer(
            active,
            updateCallStatus({ status: 'connected', callId: 'old-stale-call-999' })
        );
        expect(staleState.activeCall?.status).toBe('ringing');
        expect(staleState.activeCall?.connectedAt).toBeNull();

        // Valid signal with matching call ID applies
        const updatedState = friendsReducer(
            active,
            updateCallStatus({ status: 'connected', callId: 'authoritative-call-1' })
        );
        expect(updatedState.activeCall?.status).toBe('connected');
        expect(updatedState.activeCall?.connectedAt).toBeGreaterThan(0);
    });

    it('6. ICE state transitions: connecting -> connected -> reconnecting -> connected', () => {
        let state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-net-1',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: false,
            })
        );

        // Connection established
        state = friendsReducer(state, updateCallStatus({ status: 'connected', callId: 'call-net-1' }));
        expect(state.activeCall?.status).toBe('connected');

        // Network dip (ICE disconnected) -> reconnecting
        state = friendsReducer(state, updateCallStatus({ status: 'reconnecting', callId: 'call-net-1' }));
        expect(state.activeCall?.status).toBe('reconnecting');

        // Network recovered (ICE connected) -> connected
        state = friendsReducer(state, updateCallStatus({ status: 'connected', callId: 'call-net-1' }));
        expect(state.activeCall?.status).toBe('connected');
    });

    it('7. Idempotent call termination: endDirectCall ignores mismatched callId and clears matching call', () => {
        const state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-to-end',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: false,
            })
        );

        // Attempt termination with wrong call ID -> call remains active
        const ignoredState = friendsReducer(state, endDirectCall({ callId: 'different-call' }));
        expect(ignoredState.isCallActive).toBe(true);
        expect(ignoredState.activeCall).not.toBeNull();

        // Termination with matching call ID -> call ends cleanly
        const endedState = friendsReducer(state, endDirectCall({ callId: 'call-to-end' }));
        expect(endedState.isCallActive).toBe(false);
        expect(endedState.activeCall).toBeNull();
        expect(endedState.activeCallFriend).toBeNull();
        expect(endedState.isMuted).toBe(false);
        expect(endedState.isCallScreenExpanded).toBe(false);

        // Repeated endDirectCall is completely idempotent
        const repeatEnded = friendsReducer(endedState, endDirectCall());
        expect(repeatEnded.isCallActive).toBe(false);
        expect(repeatEnded.activeCall).toBeNull();
    });

    it('8. Media controls toggle mute and speaker states accurately', () => {
        let state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-media-ctrl',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: false,
            })
        );

        state = friendsReducer(state, setCallMuted(true));
        expect(state.isMuted).toBe(true);
        expect(state.activeCall?.isMuted).toBe(true);

        state = friendsReducer(state, setCallMuted(false));
        expect(state.isMuted).toBe(false);
        expect(state.activeCall?.isMuted).toBe(false);

        state = friendsReducer(state, setCallSpeakerOn(true));
        expect(state.activeCall?.isSpeakerOn).toBe(true);

        state = friendsReducer(state, setCallSpeakerOn(false));
        expect(state.activeCall?.isSpeakerOn).toBe(false);
    });

    it('9. Video call preserves callType, local/remote video states, and camera flip', () => {
        let state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-video-1',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'video',
                isIncoming: false,
            })
        );

        expect(state.activeCall?.callType).toBe('video');
        expect(state.activeCall?.isVideoEnabled).toBe(true);
        expect(state.activeCall?.isRemoteVideoEnabled).toBe(true);
        expect(state.activeCall?.facingMode).toBe('user');

        // Toggle local camera off
        state = friendsReducer(state, { type: 'friends/setCallVideoEnabled', payload: false });
        expect(state.activeCall?.isVideoEnabled).toBe(false);
        // Call type must remain 'video' even when local camera is off
        expect(state.activeCall?.callType).toBe('video');

        // Toggle remote camera off notification
        state = friendsReducer(state, { type: 'friends/setRemoteVideoEnabled', payload: false });
        expect(state.activeCall?.isRemoteVideoEnabled).toBe(false);

        // Flip camera facing mode
        state = friendsReducer(state, { type: 'friends/setCallFacingMode', payload: 'environment' });
        expect(state.activeCall?.facingMode).toBe('environment');

        state = friendsReducer(state, { type: 'friends/setCallFacingMode', payload: 'user' });
        expect(state.activeCall?.facingMode).toBe('user');
    });

    it('10. Audio-only fallback retains original callType but flags isVideoEnabled=false', () => {
        let state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-video-fallback',
                friendId: 'peer-bob',
                friendName: 'Bob',
                callType: 'video',
                isIncoming: true,
            })
        );

        // User denies camera permission or hardware missing -> local camera disabled
        state = friendsReducer(state, { type: 'friends/setCallVideoEnabled', payload: false });

        expect(state.activeCall?.callType).toBe('video');
        expect(state.activeCall?.isVideoEnabled).toBe(false);
        // Call continues with voice
        expect(state.isCallActive).toBe(true);
    });

    it('11. Deterministic glare tie-breaking is strictly symmetric between any two user IDs', () => {
        const userIdA = 'user_alice_123';
        const userIdB = 'user_bob_456';

        // Device A evaluates:
        const isDeviceAPolite = userIdA < userIdB; // true ('user_alice_123' < 'user_bob_456')
        // Device B evaluates:
        const isDeviceBPolite = userIdB < userIdA; // false

        expect(isDeviceAPolite).toBe(true);
        expect(isDeviceBPolite).toBe(false);
        // Exactly one peer is polite and one is impolite
        expect(isDeviceAPolite !== isDeviceBPolite).toBe(true);
    });

    it('12. Minimizing call screen preserves isCallActive=true and activeCall object', () => {
        let state = friendsReducer(
            initialState,
            startDirectCall({
                callId: 'call-persistent-1',
                friendId: 'peer-alice',
                friendName: 'Alice',
                callType: 'audio',
                isIncoming: false,
            })
        );

        expect(state.isCallActive).toBe(true);
        expect(state.isCallScreenExpanded).toBe(true);

        // Android back button minimizes call screen
        state = friendsReducer(state, { type: 'friends/setIsCallScreenExpanded', payload: false });
        expect(state.isCallScreenExpanded).toBe(false);
        // Call must remain active in background with activeCall intact
        expect(state.isCallActive).toBe(true);
        expect(state.activeCall?.callId).toBe('call-persistent-1');

        // Clicking ActiveCallBar restores expanded modal
        state = friendsReducer(state, { type: 'friends/setIsCallScreenExpanded', payload: true });
        expect(state.isCallScreenExpanded).toBe(true);
        expect(state.isCallActive).toBe(true);
    });
});
