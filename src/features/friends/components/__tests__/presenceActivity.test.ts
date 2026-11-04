import { describe, it, expect } from 'vitest';
import socialReducer, { updateUserPresence, setPresenceMap } from '../../../social/socialSlice';

describe('Sprint 2.3 Listening Activity & Presence Management', () => {
    it('updates presence state without persisting seeking positions', () => {
        const state = socialReducer(
            undefined,
            updateUserPresence({
                userId: 'user-123',
                online: true,
                lastSeen: 1700000000000,
                currentSong: {
                    id: 'song-abc',
                    title: 'Starboy',
                    artist: 'The Weeknd',
                    isPlaying: true,
                    updatedAt: 1700000000000,
                },
            })
        );

        const presence = state.onlinePresenceMap['user-123'];
        expect(presence).toBeDefined();
        expect(presence.online).toBe(true);
        expect(presence.currentSong?.title).toBe('Starboy');
        expect(presence.currentSong?.isPlaying).toBe(true);
    });

    it('sets offline status when friend leaves channel', () => {
        let state = socialReducer(
            undefined,
            setPresenceMap({
                'user-123': {
                    online: true,
                    lastSeen: 1700000000000,
                    currentSong: {
                        id: 'song-abc',
                        title: 'Starboy',
                        artist: 'The Weeknd',
                        isPlaying: true,
                        updatedAt: 1700000000000,
                    },
                },
            })
        );

        state = socialReducer(
            state,
            updateUserPresence({
                userId: 'user-123',
                online: false,
                lastSeen: 1700000005000,
                currentSong: undefined,
            })
        );

        expect(state.onlinePresenceMap['user-123'].online).toBe(false);
        expect(state.onlinePresenceMap['user-123'].currentSong).toBeUndefined();
    });
});
