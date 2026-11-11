// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import friendsReducer, {
    setFriendsList,
    startDirectCall,
    updateCallStatus,
    endDirectCall,
} from '../../friendsSlice';

describe('Sprint 2.4 Calling Engine & Communication UI Integration', () => {
    it('initializes direct call state with correlated callId and audio/video mode', () => {
        const state = friendsReducer(
            undefined,
            startDirectCall({
                callId: 'call-123456',
                friendId: 'peer-abc',
                friendName: 'John Doe',
                callType: 'video',
                isIncoming: false,
            })
        );

        expect(state.isCallActive).toBe(true);
        expect(state.activeCall?.callId).toBe('call-123456');
        expect(state.activeCall?.callType).toBe('video');
        expect(state.activeCall?.isVideoEnabled).toBe(true);
        expect(state.activeCall?.status).toBe('ringing');
    });

    it('updates call status while enforcing call correlation', () => {
        let state = friendsReducer(
            undefined,
            startDirectCall({
                callId: 'call-123456',
                friendId: 'peer-abc',
                friendName: 'John Doe',
                callType: 'audio',
                isIncoming: false,
            })
        );

        // Mismatched callId should be safely ignored
        state = friendsReducer(
            state,
            updateCallStatus({ status: 'connected', callId: 'different-call-999' })
        );
        expect(state.activeCall?.status).toBe('ringing');

        // Matching callId should update status to connected
        state = friendsReducer(
            state,
            updateCallStatus({ status: 'connected', callId: 'call-123456' })
        );
        expect(state.activeCall?.status).toBe('connected');
        expect(state.activeCall?.connectedAt).toBeDefined();
    });

    it('cleans up call resources on call termination', () => {
        let state = friendsReducer(
            undefined,
            startDirectCall({
                callId: 'call-123456',
                friendId: 'peer-abc',
                friendName: 'John Doe',
                callType: 'audio',
                isIncoming: false,
            })
        );

        state = friendsReducer(state, endDirectCall({ callId: 'call-123456' }));
        expect(state.isCallActive).toBe(false);
        expect(state.activeCall).toBeNull();
    });

    it('verifies persistentAudioManager configures audio element unmuted with full volume for WebRTC streaming', async () => {
        const { persistentAudioManager } = await import('../../../../services/webrtc/persistentAudioManager');

        const mockTrack = {
            kind: 'audio',
            enabled: true,
            id: 'mock-audio-track-1',
        };
        const mockStream = {
            id: 'mock-stream-1',
            getAudioTracks: () => [mockTrack],
            getVideoTracks: () => [],
            getTracks: () => [mockTrack],
        } as unknown as MediaStream;

        persistentAudioManager.attachStream(mockStream);
        const audioEl = document.getElementById('vibeon-webrtc-remote-audio') as HTMLAudioElement;

        expect(audioEl).not.toBeNull();
        expect(audioEl.muted).toBe(false);
        expect(audioEl.volume).toBe(1.0);
        expect(audioEl.srcObject).toBe(mockStream);

        persistentAudioManager.stop();
        expect(audioEl.srcObject).toBeNull();
    });
});
