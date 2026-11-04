import { describe, it, expect } from 'vitest';
import socialReducer, {
    setMyProfile,
    setCloudFriends,
    removeCloudFriend,
    setFriendRequests,
    addOutgoingRequest,
    removeRequest,
    markNotificationRead,
    markAllNotificationsRead,
} from '../../../social/socialSlice';
import { UserProfile, Friendship, SocialNotification } from '../../../../types/social';

describe('Sprint 2.2 Social State & Relationship Workflows', () => {
    const mockProfile1: UserProfile = {
        id: '11111111-1111-4111-a111-111111111111',
        username: 'alice_vibe',
        display_name: 'Alice',
        is_private: false,
        share_activity: true,
        show_online: true,
        allow_discovery: true,
        updated_at: new Date().toISOString(),
    };

    const mockProfile2: UserProfile = {
        id: '22222222-2222-4222-a222-222222222222',
        username: 'bob_music',
        display_name: 'Bob',
        is_private: true,
        share_activity: false,
        show_online: false,
        allow_discovery: true,
        updated_at: new Date().toISOString(),
    };

    const mockFriendship: Friendship = {
        id: 'friendship-1',
        user_id_1: mockProfile1.id,
        user_id_2: mockProfile2.id,
        requester_id: mockProfile1.id,
        recipient_id: mockProfile2.id,
        status: 'accepted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        friend_profile: mockProfile2,
    };

    it('sets my profile accurately', () => {
        const state = socialReducer(undefined, setMyProfile(mockProfile1));
        expect(state.myProfile?.username).toBe('alice_vibe');
        expect(state.myProfile?.share_activity).toBe(true);
    });

    it('manages cloud friendships list and removal', () => {
        let state = socialReducer(undefined, setCloudFriends([mockFriendship]));
        expect(state.cloudFriends).toHaveLength(1);

        state = socialReducer(state, removeCloudFriend(mockProfile2.id));
        expect(state.cloudFriends).toHaveLength(0);
    });

    it('manages incoming and outgoing friend requests', () => {
        const pendingRequest: Friendship = {
            ...mockFriendship,
            id: 'req-99',
            status: 'pending',
        };

        let state = socialReducer(
            undefined,
            setFriendRequests({ incoming: [pendingRequest], outgoing: [] })
        );
        expect(state.incomingRequests).toHaveLength(1);

        state = socialReducer(state, addOutgoingRequest(pendingRequest));
        expect(state.outgoingRequests).toHaveLength(1);

        state = socialReducer(state, removeRequest('req-99'));
        expect(state.incomingRequests).toHaveLength(0);
        expect(state.outgoingRequests).toHaveLength(0);
    });

    it('handles notification read state transitions and badge count', () => {
        const notif: SocialNotification = {
            id: 'notif-1',
            user_id: mockProfile1.id,
            actor_id: mockProfile2.id,
            type: 'friend_request_received',
            title: 'New Request',
            message: 'Bob sent you a request',
            is_read: false,
            created_at: new Date().toISOString(),
        };

        let state = socialReducer(undefined, {
            type: 'social/setNotifications',
            payload: [notif],
        });
        expect(state.unreadNotificationsCount).toBe(1);

        state = socialReducer(state, markNotificationRead('notif-1'));
        expect(state.unreadNotificationsCount).toBe(0);
        expect(state.notifications[0].is_read).toBe(true);
    });
});
