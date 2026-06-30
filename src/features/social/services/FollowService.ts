import { supabase } from '../../../lib/supabase';
import { syncManager } from '../../../lib/sync/SyncManager';
import { UserProfile } from '../types';

export interface FollowResult {
    profiles: Partial<UserProfile>[];
    nextCursor: string | null;
}

export class FollowService {
    private static instance: FollowService;

    private constructor() {}

    public static getInstance(): FollowService {
        if (!FollowService.instance) {
            FollowService.instance = new FollowService();
        }
        return FollowService.instance;
    }

    async follow(targetUserId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await syncManager.enqueue('follow', 'create', {
            follower_id: user.id,
            following_id: targetUserId
        });
    }

    async unfollow(targetUserId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await syncManager.enqueue('follow', 'delete', {
            following_id: targetUserId
        });
    }

    async getFollowers(userId: string, cursor?: string, limit: number = 20): Promise<FollowResult> {
        let query = supabase
            .from('follows')
            .select('follower_id, profiles!follows_follower_id_fkey(*)')
            .eq('following_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt('created_at', cursor);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            profiles: data.map(d => d.profiles as any),
            nextCursor: data.length === limit ? data[data.length - 1].created_at : null
        };
    }

    async getFollowing(userId: string, cursor?: string, limit: number = 20): Promise<FollowResult> {
        let query = supabase
            .from('follows')
            .select('following_id, profiles!follows_following_id_fkey(*)')
            .eq('follower_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt('created_at', cursor);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            profiles: data.map(d => d.profiles as any),
            nextCursor: data.length === limit ? data[data.length - 1].created_at : null
        };
    }

    async getSuggestedUsers(): Promise<Partial<UserProfile>[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('privacy_settings->>profile', 'visible')
            .limit(10);

        if (error) return [];
        return data as any;
    }
}

export const followService = FollowService.getInstance();
