import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, ActivityItem, Notification, CollaborativePlaylist } from './types';

interface SocialState {
    currentUserProfile: UserProfile | null;
    profiles: Record<string, UserProfile>;
    activityFeed: ActivityItem[];
    notifications: Notification[];
    unreadNotificationCount: number;
    following: string[]; // User IDs
    followers: string[]; // User IDs
    activeCollaborativePlaylists: Record<string, CollaborativePlaylist>;
    loading: {
        profile: boolean;
        feed: boolean;
        notifications: boolean;
    };
    error: string | null;
}

const initialState: SocialState = {
    currentUserProfile: null,
    profiles: {},
    activityFeed: [],
    notifications: [],
    unreadNotificationCount: 0,
    following: [],
    followers: [],
    activeCollaborativePlaylists: {},
    loading: {
        profile: false,
        feed: false,
        notifications: false,
    },
    error: null,
};

const socialSlice = createSlice({
    name: 'social',
    initialState,
    reducers: {
        setCurrentUserProfile: (state, action: PayloadAction<UserProfile | null>) => {
            state.currentUserProfile = action.payload;
        },
        setProfile: (state, action: PayloadAction<UserProfile>) => {
            state.profiles[action.payload.id] = action.payload;
        },
        setActivityFeed: (state, action: PayloadAction<ActivityItem[]>) => {
            state.activityFeed = action.payload;
        },
        appendActivityFeed: (state, action: PayloadAction<ActivityItem[]>) => {
            state.activityFeed = [...state.activityFeed, ...action.payload];
        },
        setNotifications: (state, action: PayloadAction<Notification[]>) => {
            state.notifications = action.payload;
            state.unreadNotificationCount = action.payload.filter(n => !n.isRead).length;
        },
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications = [action.payload, ...state.notifications];
            if (!action.payload.isRead) state.unreadNotificationCount++;
        },
        markNotificationRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
            }
        },
        setFollowing: (state, action: PayloadAction<string[]>) => {
            state.following = action.payload;
        },
        setFollowers: (state, action: PayloadAction<string[]>) => {
            state.followers = action.payload;
        },
        updateCollaborativePlaylist: (state, action: PayloadAction<CollaborativePlaylist>) => {
            state.activeCollaborativePlaylists[action.payload.id] = action.payload;
        },
        setLoading: (state, action: PayloadAction<{ key: keyof SocialState['loading']; value: boolean }>) => {
            state.loading[action.payload.key] = action.payload.value;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setCurrentUserProfile,
    setProfile,
    setActivityFeed,
    appendActivityFeed,
    setNotifications,
    addNotification,
    markNotificationRead,
    setFollowing,
    setFollowers,
    updateCollaborativePlaylist,
    setLoading,
    setError,
} = socialSlice.actions;

export default socialSlice.reducer;
