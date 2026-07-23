import { describe, it, expect } from 'vitest';
import socialReducer, { setCurrentUserProfile, setFollowing } from './socialSlice';
import { UserProfile } from './types';

describe('socialSlice', () => {
    it('should handle setCurrentUserProfile', () => {
        const initialState = undefined as any;
        const profile: UserProfile = { id: 'u1', displayName: 'User 1', avatarUrl: '', bio: '', tasteProfile: {} as any, stats: {} as any, visibility: 'public' };
        const state = socialReducer(initialState, setCurrentUserProfile(profile));
        expect(state.currentUserProfile).toEqual(profile);
    });

    it('should handle setFollowing', () => {
        const initialState = undefined as any;
        const following = ['u2', 'u3'];
        const state = socialReducer(initialState, setFollowing(following));
        expect(state.following).toEqual(following);
    });
});
