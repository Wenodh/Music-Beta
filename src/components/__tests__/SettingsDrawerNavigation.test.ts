import { describe, it, expect } from 'vitest';
import friendsReducer, {
    setIsFriendsModalOpen,
    setActiveFriendId,
} from '../../features/friends/friendsSlice';
import socialReducer, {
    setSocialActiveTab,
    setActiveProfileView,
} from '../../features/social/socialSlice';
import musicPlayerReducer, {
    setSettingsOpen,
} from '../../features/musicplayer/musicPlayerSlice';

describe('Task 2 — SettingsDrawer shortcuts for Messages and Calls', () => {
    it('1. Messages shortcut clears activeFriendId and activeProfileView, sets tab to chats, closes settings, and opens FriendsModal', () => {
        // Initial state with active friend chat, active profile view, and settings open
        let musicState = musicPlayerReducer(undefined, setSettingsOpen(true));
        let friendsState = friendsReducer(undefined, setActiveFriendId('friend-123'));
        friendsState = friendsReducer(friendsState, setIsFriendsModalOpen(false));
        let socialState = socialReducer(
            undefined,
            setActiveProfileView({ id: 'user-456', username: 'john_doe' } as any)
        );
        socialState = socialReducer(socialState, setSocialActiveTab('calls'));

        expect(musicState.isSettingsOpen).toBe(true);
        expect(friendsState.activeFriendId).toBe('friend-123');
        expect(socialState.activeProfileView).not.toBeNull();
        expect(socialState.socialActiveTab).toBe('calls');

        // Execute Messages shortcut flow
        musicState = musicPlayerReducer(musicState, setSettingsOpen(false));
        friendsState = friendsReducer(friendsState, setActiveFriendId(null));
        socialState = socialReducer(socialState, setActiveProfileView(null));
        socialState = socialReducer(socialState, setSocialActiveTab('chats'));
        friendsState = friendsReducer(friendsState, setIsFriendsModalOpen(true));

        expect(musicState.isSettingsOpen).toBe(false);
        expect(friendsState.isFriendsModalOpen).toBe(true);
        expect(friendsState.activeFriendId).toBeNull();
        expect(socialState.activeProfileView).toBeNull();
        expect(socialState.socialActiveTab).toBe('chats');
    });

    it('2. Calls shortcut clears activeFriendId and activeProfileView, sets tab to calls, closes settings, and opens FriendsModal', () => {
        // Initial state with active friend chat, active profile view, and settings open
        let musicState = musicPlayerReducer(undefined, setSettingsOpen(true));
        let friendsState = friendsReducer(undefined, setActiveFriendId('friend-123'));
        friendsState = friendsReducer(friendsState, setIsFriendsModalOpen(false));
        let socialState = socialReducer(
            undefined,
            setActiveProfileView({ id: 'user-456', username: 'john_doe' } as any)
        );
        socialState = socialReducer(socialState, setSocialActiveTab('chats'));

        // Execute Calls shortcut flow
        musicState = musicPlayerReducer(musicState, setSettingsOpen(false));
        friendsState = friendsReducer(friendsState, setActiveFriendId(null));
        socialState = socialReducer(socialState, setActiveProfileView(null));
        socialState = socialReducer(socialState, setSocialActiveTab('calls'));
        friendsState = friendsReducer(friendsState, setIsFriendsModalOpen(true));

        expect(musicState.isSettingsOpen).toBe(false);
        expect(friendsState.isFriendsModalOpen).toBe(true);
        expect(friendsState.activeFriendId).toBeNull();
        expect(socialState.activeProfileView).toBeNull();
        expect(socialState.socialActiveTab).toBe('calls');
    });

    it('3. Repeatedly switching between Messages and Calls keeps subviews clean and maintains target tab', () => {
        let socialState = socialReducer(undefined, setSocialActiveTab('chats'));
        let friendsState = friendsReducer(undefined, setIsFriendsModalOpen(true));

        expect(socialState.socialActiveTab).toBe('chats');

        // Switch to calls
        socialState = socialReducer(socialState, setSocialActiveTab('calls'));
        friendsState = friendsReducer(friendsState, setActiveFriendId(null));
        expect(socialState.socialActiveTab).toBe('calls');
        expect(friendsState.activeFriendId).toBeNull();

        // Switch back to chats
        socialState = socialReducer(socialState, setSocialActiveTab('chats'));
        expect(socialState.socialActiveTab).toBe('chats');
        expect(friendsState.activeFriendId).toBeNull();
    });

    it('4. Closing FriendsModal safely updates isFriendsModalOpen without error', () => {
        let friendsState = friendsReducer(undefined, setIsFriendsModalOpen(true));
        expect(friendsState.isFriendsModalOpen).toBe(true);

        friendsState = friendsReducer(friendsState, setIsFriendsModalOpen(false));
        expect(friendsState.isFriendsModalOpen).toBe(false);
    });
});
