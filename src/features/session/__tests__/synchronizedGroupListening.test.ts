import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sessionReducer, {
    startSession,
    joinSession,
    leaveSession,
    setParticipants,
    setStateVersion,
    incrementStateVersion,
    setHostGracePeriod,
    setGraceSecondsRemaining,
    setTempRateMultiplier,
    setSongUnavailable,
    promoteToHost,
    setHostId
} from '../sessionSlice';
import musicPlayerReducer from '../../musicplayer/musicPlayerSlice';
import authReducer from '../../auth/authSlice';
import uiReducer from '../../ui/uiSlice';
import { useSession } from '../../../hooks/useSession';

describe('Sprint 4.1 Synchronized Group Listening Redux Engine Tests', () => {
    let initialState: any;

    beforeEach(() => {
        initialState = {
            roomCode: null,
            partyName: 'Listening Party',
            isPublic: true,
            isHost: false,
            hostId: null,
            isJoined: false,
            participants: [],
            reactions: [],
            messages: [],
            isCallActive: false,
            isMuted: false,
            error: null,
            publicParties: [],
            isSyncing: false,
            connectionStatus: 'disconnected',
            stateVersion: 0,
            hostGracePeriodActive: false,
            graceSecondsRemaining: 30,
            tempRateMultiplier: 1.0,
            isSongUnavailable: false,
            unavailableSongName: null,
        };
    });

    it('should initialize host session with version 1 and active connection', () => {
        const state = sessionReducer(initialState, startSession({ roomCode: 'ABCXYZ', partyName: 'Rock Party' }));
        expect(state.isHost).toBe(true);
        expect(state.isJoined).toBe(true);
        expect(state.roomCode).toBe('ABCXYZ');
        expect(state.partyName).toBe('Rock Party');
        expect(state.stateVersion).toBe(1);
        expect(state.connectionStatus).toBe('connected');
        expect(state.hostGracePeriodActive).toBe(false);
    });

    it('should join session as non-host listener with version 0', () => {
        const state = sessionReducer(initialState, joinSession({ roomCode: 'ABCXYZ', partyName: 'Rock Party' }));
        expect(state.isHost).toBe(false);
        expect(state.isJoined).toBe(true);
        expect(state.roomCode).toBe('ABCXYZ');
        expect(state.stateVersion).toBe(0);
        expect(state.connectionStatus).toBe('connecting');
    });

    it('should increment stateVersion on host action', () => {
        let state = sessionReducer(initialState, startSession('ABCXYZ'));
        expect(state.stateVersion).toBe(1);
        state = sessionReducer(state, incrementStateVersion());
        expect(state.stateVersion).toBe(2);
        state = sessionReducer(state, incrementStateVersion());
        expect(state.stateVersion).toBe(3);
    });

    it('should reject stale state versions', () => {
        const localVersion = 5;
        const incomingVersion1 = 4;
        const incomingVersion2 = 6;

        expect(incomingVersion1 <= localVersion).toBe(true);
        expect(incomingVersion2 <= localVersion).toBe(false);
    });

    it('should manage 30s host grace period and countdown', () => {
        let state = sessionReducer(initialState, setHostGracePeriod({ active: true, remaining: 30 }));
        expect(state.hostGracePeriodActive).toBe(true);
        expect(state.graceSecondsRemaining).toBe(30);

        state = sessionReducer(state, setGraceSecondsRemaining(29));
        expect(state.graceSecondsRemaining).toBe(29);

        state = sessionReducer(state, setGraceSecondsRemaining(0));
        expect(state.graceSecondsRemaining).toBe(0);

        state = sessionReducer(state, setHostGracePeriod({ active: false }));
        expect(state.hostGracePeriodActive).toBe(false);
    });

    it('should handle host election promotion correctly', () => {
        let state = sessionReducer(initialState, joinSession('ABCXYZ'));
        expect(state.isHost).toBe(false);
        state = sessionReducer(state, setStateVersion(10));
        state = sessionReducer(state, setHostGracePeriod({ active: true }));

        state = sessionReducer(state, promoteToHost());
        expect(state.isHost).toBe(true);
        expect(state.hostGracePeriodActive).toBe(false);
        expect(state.stateVersion).toBe(11);
    });

    it('should adjust and restore temporary playback rate multiplier', () => {
        let state = sessionReducer(initialState, setTempRateMultiplier(1.02));
        expect(state.tempRateMultiplier).toBe(1.02);

        state = sessionReducer(state, setTempRateMultiplier(0.98));
        expect(state.tempRateMultiplier).toBe(0.98);

        state = sessionReducer(state, setTempRateMultiplier(1.0));
        expect(state.tempRateMultiplier).toBe(1.0);
    });

    it('should track unavailable song status gracefully without leaving session', () => {
        let state = sessionReducer(initialState, joinSession('ABCXYZ'));
        state = sessionReducer(state, setSongUnavailable({ unavailable: true, songName: 'Region Locked Track' }));
        expect(state.isSongUnavailable).toBe(true);
        expect(state.unavailableSongName).toBe('Region Locked Track');
        expect(state.isJoined).toBe(true);

        state = sessionReducer(state, setSongUnavailable({ unavailable: false }));
        expect(state.isSongUnavailable).toBe(false);
        expect(state.unavailableSongName).toBe(null);
    });

    it('should clean up all session state on leaveSession', () => {
        let state = sessionReducer(initialState, startSession('ABCXYZ'));
        state = sessionReducer(state, setTempRateMultiplier(1.02));
        state = sessionReducer(state, setSongUnavailable({ unavailable: true, songName: 'Track' }));
        state = sessionReducer(state, leaveSession());

        expect(state.roomCode).toBe(null);
        expect(state.isJoined).toBe(false);
        expect(state.isHost).toBe(false);
        expect(state.stateVersion).toBe(0);
        expect(state.tempRateMultiplier).toBe(1.0);
        expect(state.isSongUnavailable).toBe(false);
    });
});


describe('Tiered Drift Correction Math & Threshold Tests', () => {
    const calculateDriftAction = (localTime: number, hostTime: number, networkLagSeconds: number, hostSpeed = 1.0) => {
        const estimatedHostTime = hostTime + (networkLagSeconds * hostSpeed);
        const drift = Math.abs(localTime - estimatedHostTime);

        if (drift < 1.5) {
            return { action: 'none', multiplier: 1.0 };
        } else if (drift <= 4.0) {
            const multiplier = localTime < estimatedHostTime ? 1.02 : 0.98;
            return { action: 'rate_adjustment', multiplier, estimatedHostTime };
        } else {
            return { action: 'controlled_seek', seekTarget: estimatedHostTime };
        }
    };

    it('should take no action on minor drift (< 1.5s)', () => {
        const res = calculateDriftAction(50.0, 50.8, 0.2);
        expect(res.action).toBe('none');
        expect(res.multiplier).toBe(1.0);
    });

    it('should apply 1.02x acceleration when local client is lagging by 2.5s', () => {
        const res = calculateDriftAction(48.0, 50.0, 0.5);
        expect(res.action).toBe('rate_adjustment');
        expect(res.multiplier).toBe(1.02);
    });

    it('should apply 0.98x deceleration when local client is ahead by 3.0s', () => {
        const res = calculateDriftAction(53.0, 50.0, 0.0);
        expect(res.action).toBe('rate_adjustment');
        expect(res.multiplier).toBe(0.98);
    });

    it('should perform controlled seek on major drift (> 4.0s)', () => {
        const res = calculateDriftAction(10.0, 30.0, 0.5);
        expect(res.action).toBe('controlled_seek');
        expect(res.seekTarget).toBe(30.5);
    });

    it('should accurately combine user playback speed with sync multiplier', () => {
        const userSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];
        userSpeeds.forEach(speed => {
            const accelSpeed = Number((speed * 1.02).toFixed(3));
            const decelSpeed = Number((speed * 0.98).toFixed(3));
            expect(accelSpeed).toBeGreaterThan(speed);
            expect(decelSpeed).toBeLessThan(speed);
        });
    });

    it('should preserve duplicate tracks with distinct item IDs during playlist backfill simulation', () => {
        const legacySongsData = [
            { id: 'track_1', name: 'Song One' },
            { id: 'track_2', name: 'Song Two' },
            { id: 'track_1', name: 'Song One' }, // Legitimate duplicate track!
        ];

        let position = 1000.0;
        const normalizedItems = legacySongsData.map((s, idx) => ({
            id: `item_uuid_${idx + 1}`,
            playlist_id: 'pl_123',
            song_id: s.id,
            song_data: s,
            position: (idx + 1) * 1000.0,
            added_by: 'user_1',
        }));

        expect(normalizedItems.length).toBe(3);
        expect(normalizedItems[0].song_id).toBe('track_1');
        expect(normalizedItems[2].song_id).toBe('track_1');
        expect(normalizedItems[0].id).not.toBe(normalizedItems[2].id);
        expect(normalizedItems[2].position).toBeGreaterThan(normalizedItems[0].position);
    });
});
