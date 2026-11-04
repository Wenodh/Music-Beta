// Vibe On — Social Layer TypeScript Definitions

export interface UserProfile {
    id: string; // references auth.users(id)
    username: string; // unique, lowercase, alphanumeric + underscores
    display_name: string;
    avatar_url?: string;
    bio?: string;
    is_private: boolean;
    share_activity: boolean;
    show_online: boolean;
    allow_discovery: boolean;
    created_at?: string;
    updated_at: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
    id: string;
    user_id_1: string; // lexicographically smaller UUID (canonical pair)
    user_id_2: string; // lexicographically larger UUID
    requester_id: string; // who initiated the request or block
    recipient_id: string; // recipient of the request or target of block
    status: FriendshipStatus;
    blocked_by?: string | null;
    created_at: string;
    updated_at: string;
    // Joined profile details (when returned from queries/RPCs)
    friend_profile?: UserProfile;
}

export interface FriendRequestItem {
    id: string;
    friendship_id: string;
    requester_id: string;
    recipient_id: string;
    direction: 'incoming' | 'outgoing';
    status: FriendshipStatus;
    created_at: string;
    profile: UserProfile;
}

export interface SocialPresenceState {
    odid: string; // online device id
    userId: string;
    online: boolean;
    lastSeen: number;
    currentSong?: {
        id: string;
        title: string;
        artist: string;
        artworkUrl?: string;
        isPlaying: boolean;
        updatedAt: number;
    };
}

export type SocialNotificationType =
    | 'friend_request_received'
    | 'friend_request_accepted'
    | 'friend_request_declined'
    | 'missed_call'
    | 'friend_activity';

export interface SocialNotification {
    id: string;
    user_id: string;
    actor_id?: string;
    type: SocialNotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
    actor_profile?: UserProfile;
}

export interface GuestMigrationResult {
    totalContacts: number;
    migratedContacts: number;
    skippedContacts: number;
    totalCallLogs: number;
    migratedCallLogs: number;
}
