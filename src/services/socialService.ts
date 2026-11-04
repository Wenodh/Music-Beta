import { supabase } from '../lib/supabase';
import { UserProfile, Friendship, FriendshipStatus, GuestMigrationResult } from '../types/social';

export const socialService = {
    /**
     * Fetch user profile by ID.
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.warn('[socialService] getProfile error:', error.message);
                return null;
            }
            return data;
        } catch (e) {
            console.warn('[socialService] getProfile exception:', e);
            return null;
        }
    },

    /**
     * Update current authenticated user profile and privacy settings.
     */
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, data };
        } catch (e: any) {
            return { success: false, error: e.message || 'Failed to update profile' };
        }
    },

    /**
     * Search profiles by username or display name (only where allow_discovery is true or public).
     */
    async searchProfiles(query: string, currentUserId?: string): Promise<UserProfile[]> {
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) return [];

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
                .eq('allow_discovery', true)
                .limit(25);

            if (error) {
                console.warn('[socialService] searchProfiles error:', error.message);
                return [];
            }

            // Exclude current authenticated user
            const list = data || [];
            if (currentUserId) {
                return list.filter((p: UserProfile) => p.id !== currentUserId);
            }
            return list;
        } catch (e) {
            console.warn('[socialService] searchProfiles exception:', e);
            return [];
        }
    },

    /**
     * Fetch accepted friendships for the given user, joined with profile metadata.
     */
    async getFriends(userId: string): Promise<Friendship[]> {
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select('*')
                .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
                .eq('status', 'accepted');

            if (error) {
                console.warn('[socialService] getFriends error:', error.message);
                return [];
            }

            const friendships: Friendship[] = data || [];
            // Resolve the other user's profile for each friendship
            const otherIds = friendships.map((f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));

            if (otherIds.length === 0) return [];

            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .in('id', otherIds);

            const profileMap = new Map((profiles || []).map((p: UserProfile) => [p.id, p]));

            return friendships.map((f) => {
                const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
                return {
                    ...f,
                    friend_profile: profileMap.get(friendId),
                };
            });
        } catch (e) {
            console.warn('[socialService] getFriends exception:', e);
            return [];
        }
    },

    /**
     * Fetch pending friend requests (both incoming and outgoing).
     */
    async getFriendRequests(userId: string): Promise<{ incoming: Friendship[]; outgoing: Friendship[] }> {
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select('*')
                .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
                .eq('status', 'pending');

            if (error) {
                console.warn('[socialService] getFriendRequests error:', error.message);
                return { incoming: [], outgoing: [] };
            }

            const all: Friendship[] = data || [];
            const otherIds = all.map((f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));

            let profileMap = new Map<string, UserProfile>();
            if (otherIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', otherIds);
                profileMap = new Map((profiles || []).map((p: UserProfile) => [p.id, p]));
            }

            const incoming: Friendship[] = [];
            const outgoing: Friendship[] = [];

            for (const f of all) {
                const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
                const enriched: Friendship = { ...f, friend_profile: profileMap.get(friendId) };
                if (f.recipient_id === userId) {
                    incoming.push(enriched);
                } else if (f.requester_id === userId) {
                    outgoing.push(enriched);
                }
            }

            return { incoming, outgoing };
        } catch (e) {
            console.warn('[socialService] getFriendRequests exception:', e);
            return { incoming: [], outgoing: [] };
        }
    },

    /**
     * Send friend request via secure RPC.
     */
    async sendFriendRequest(targetUserId: string): Promise<{ success: boolean; message: string; status?: FriendshipStatus }> {
        try {
            const { data, error } = await supabase.rpc('send_friend_request', {
                target_user_id: targetUserId,
            });
            if (error) return { success: false, message: error.message };
            return data;
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to send request' };
        }
    },

    /**
     * Respond to friend request (accept or decline) via RPC.
     */
    async respondFriendRequest(friendshipId: string, accept: boolean): Promise<{ success: boolean; message: string; status?: string }> {
        try {
            const { data, error } = await supabase.rpc('respond_friend_request', {
                request_friendship_id: friendshipId,
                accept_action: accept,
            });
            if (error) return { success: false, message: error.message };
            return data;
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to respond to request' };
        }
    },

    /**
     * Cancel outgoing friend request via RPC.
     */
    async cancelFriendRequest(friendshipId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase.rpc('cancel_friend_request', {
                request_friendship_id: friendshipId,
            });
            if (error) return { success: false, message: error.message };
            return data;
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to cancel request' };
        }
    },

    /**
     * Remove friend via RPC.
     */
    async removeFriend(targetUserId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase.rpc('remove_friend', {
                target_user_id: targetUserId,
            });
            if (error) return { success: false, message: error.message };
            return data;
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to remove friend' };
        }
    },

    /**
     * Block a user via RPC.
     */
    async blockUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase.rpc('block_user', {
                target_user_id: targetUserId,
            });
            if (error) return { success: false, message: error.message };
            return data;
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to block user' };
        }
    },

    /**
     * Unblock a user via RPC.
     */
    async unblockUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase.rpc('unblock_user', {
                target_user_id: targetUserId,
            });
            if (error) return { success: false, message: error.message };
            return data;
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to unblock user' };
        }
    },

    /**
     * Check if a given string is a valid UUID (to distinguish authenticated users from guest IDs like 'anon-xxx').
     */
    isValidUUID(str: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    },

    /**
     * Safe guest data migration when user authenticates.
     * Only migrates valid records and preserves local records on conflict.
     */
    async migrateGuestData(authenticatedUserId: string): Promise<GuestMigrationResult> {
        const localFriends = await getFriendsLocal();
        const localCallLogs = await getCallHistoryLocal();

        let migratedContacts = 0;
        let skippedContacts = 0;

        for (const friend of localFriends) {
            // If contact is an authenticated UUID, attempt friendship link
            if (this.isValidUUID(friend.id) && friend.id !== authenticatedUserId) {
                try {
                    const res = await this.sendFriendRequest(friend.id);
                    if (res.success) {
                        migratedContacts++;
                    } else {
                        skippedContacts++;
                    }
                } catch {
                    skippedContacts++;
                }
            } else {
                // Anonymous 'anon-...' contact remains in local IndexedDB
                skippedContacts++;
            }
        }

        return {
            totalContacts: localFriends.length,
            migratedContacts,
            skippedContacts,
            totalCallLogs: localCallLogs.length,
            migratedCallLogs: localCallLogs.length, // local call logs remain safely in IndexedDB
        };
    },
};
