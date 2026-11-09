import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, Friendship, SocialNotification } from '../../types/social';

interface SocialState {
    myProfile: UserProfile | null;
    cloudFriends: Friendship[];
    incomingRequests: Friendship[];
    outgoingRequests: Friendship[];
    notifications: SocialNotification[];
    unreadNotificationsCount: number;
    activeProfileView: UserProfile | null;
    isNotificationPanelOpen: boolean;
    onlinePresenceMap: Record<string, { online: boolean; lastSeen: number; currentSong?: any }>;
    isLoadingFriends: boolean;
    isLoadingRequests: boolean;
    socialActiveTab: 'chats' | 'calls' | 'discover' | 'activity';
}

const initialState: SocialState = {
    myProfile: null,
    cloudFriends: [],
    incomingRequests: [],
    outgoingRequests: [],
    notifications: [],
    unreadNotificationsCount: 0,
    activeProfileView: null,
    isNotificationPanelOpen: false,
    onlinePresenceMap: {},
    isLoadingFriends: false,
    isLoadingRequests: false,
    socialActiveTab: 'chats',
};

const socialSlice = createSlice({
    name: 'social',
    initialState,
    reducers: {
        setMyProfile: (state, action: PayloadAction<UserProfile | null>) => {
            state.myProfile = action.payload;
        },
        setCloudFriends: (state, action: PayloadAction<Friendship[]>) => {
            state.cloudFriends = action.payload;
        },
        removeCloudFriend: (state, action: PayloadAction<string>) => {
            // Remove by other user id
            const targetId = action.payload;
            state.cloudFriends = state.cloudFriends.filter(
                (f) => f.user_id_1 !== targetId && f.user_id_2 !== targetId
            );
        },
        setFriendRequests: (state, action: PayloadAction<{ incoming: Friendship[]; outgoing: Friendship[] }>) => {
            state.incomingRequests = action.payload.incoming;
            state.outgoingRequests = action.payload.outgoing;
        },
        addOutgoingRequest: (state, action: PayloadAction<Friendship>) => {
            if (!state.outgoingRequests.some((r) => r.id === action.payload.id)) {
                state.outgoingRequests.push(action.payload);
            }
        },
        removeRequest: (state, action: PayloadAction<string>) => {
            const reqId = action.payload;
            state.incomingRequests = state.incomingRequests.filter((r) => r.id !== reqId);
            state.outgoingRequests = state.outgoingRequests.filter((r) => r.id !== reqId);
        },
        setNotifications: (state, action: PayloadAction<SocialNotification[]>) => {
            state.notifications = action.payload;
            state.unreadNotificationsCount = action.payload.filter((n) => !n.is_read).length;
        },
        addNotification: (state, action: PayloadAction<SocialNotification>) => {
            // Avoid duplicates
            if (!state.notifications.some((n) => n.id === action.payload.id)) {
                state.notifications.unshift(action.payload);
                if (!action.payload.is_read) {
                    state.unreadNotificationsCount += 1;
                }
            }
        },
        markNotificationRead: (state, action: PayloadAction<string>) => {
            const notif = state.notifications.find((n) => n.id === action.payload);
            if (notif && !notif.is_read) {
                notif.is_read = true;
                state.unreadNotificationsCount = Math.max(0, state.unreadNotificationsCount - 1);
            }
        },
        markAllNotificationsRead: (state) => {
            state.notifications.forEach((n) => {
                n.is_read = true;
            });
            state.unreadNotificationsCount = 0;
        },
        setActiveProfileView: (state, action: PayloadAction<UserProfile | null>) => {
            state.activeProfileView = action.payload;
        },
        setIsNotificationPanelOpen: (state, action: PayloadAction<boolean>) => {
            state.isNotificationPanelOpen = action.payload;
        },
        updateUserPresence: (
            state,
            action: PayloadAction<{ userId: string; online: boolean; lastSeen: number; currentSong?: any }>
        ) => {
            state.onlinePresenceMap[action.payload.userId] = {
                online: action.payload.online,
                lastSeen: action.payload.lastSeen,
                currentSong: action.payload.currentSong,
            };
        },
        setPresenceMap: (
            state,
            action: PayloadAction<Record<string, { online: boolean; lastSeen: number; currentSong?: any }>>
        ) => {
            state.onlinePresenceMap = action.payload;
        },
        setIsLoadingFriends: (state, action: PayloadAction<boolean>) => {
            state.isLoadingFriends = action.payload;
        },
        setIsLoadingRequests: (state, action: PayloadAction<boolean>) => {
            state.isLoadingRequests = action.payload;
        },
        setSocialActiveTab: (state, action: PayloadAction<'chats' | 'calls' | 'discover' | 'activity'>) => {
            state.socialActiveTab = action.payload;
        },
    },
});

export const {
    setMyProfile,
    setCloudFriends,
    removeCloudFriend,
    setFriendRequests,
    addOutgoingRequest,
    removeRequest,
    setNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveProfileView,
    setIsNotificationPanelOpen,
    updateUserPresence,
    setPresenceMap,
    setIsLoadingFriends,
    setIsLoadingRequests,
    setSocialActiveTab,
} = socialSlice.actions;

export default socialSlice.reducer;
