import { MediaItem } from '../../lib/audio-sdk/models';

export type PrivacyLevel = 'public' | 'followers' | 'private';

export interface PrivacySettings {
    profile: PrivacyLevel;
    activity: PrivacyLevel;
    listening: PrivacyLevel;
    favorites: PrivacyLevel;
    playlists: PrivacyLevel;
    followers: 'visible' | 'private';
    following: 'visible' | 'private';
}

export interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    role?: 'listener' | 'creator' | 'admin';
    favoriteGenres: string[];
    listeningStats: ListeningStats;
    privacySettings: PrivacySettings;
    badges: string[];
    isOnboarded: boolean;
    updatedAt: string;
    createdAt: string;
}

export interface ListeningStats {
    totalTime: number;
    topGenres: { genre: string; score: number }[];
    topArtists: { name: string; score: number }[];
    milestones: string[];
}

export interface ActivityItem {
    id: string;
    userId: string;
    type: ActivityType;
    payload: any;
    visibility: PrivacyLevel;
    createdAt: string;
    actor?: Partial<UserProfile>;
}

export type ActivityType =
    | 'playlist_shared'
    | 'follow'
    | 'milestone'
    | 'recommendation'
    | 'podcast_new';

export interface CollaborativePlaylist {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    artworkUrl?: string;
    isPublic: boolean;
    version: number;
    updatedAt: string;
    members?: PlaylistMember[];
}

export interface PlaylistMember {
    playlistId: string;
    userId: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: string;
    profile?: Partial<UserProfile>;
}

export interface PlaylistOperation {
    id: string;
    playlistId: string;
    userId: string;
    opType: 'add' | 'remove' | 'move' | 'rename' | 'reorder';
    payload: any;
    sequenceNumber: number;
    createdAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    actorId?: string;
    type: NotificationType;
    payload: any;
    isRead: boolean;
    createdAt: string;
    actor?: Partial<UserProfile>;
}

export type NotificationType =
    | 'new_follower'
    | 'playlist_invite'
    | 'playlist_update'
    | 'recommendation';

export interface SocialRecommendation {
    mediaId: string;
    provider: string;
    mediaType: string;
    reasons: string[];
    note?: string;
    sharedBy: string;
}
