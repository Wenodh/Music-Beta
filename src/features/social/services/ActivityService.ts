import { supabase } from '../../../lib/supabase';
import { ActivityItem } from '../types';

export class ActivityService {
    private static instance: ActivityService;

    private constructor() {}

    public static getInstance(): ActivityService {
        if (!ActivityService.instance) {
            ActivityService.instance = new ActivityService();
        }
        return ActivityService.instance;
    }

    async getFeed(cursor?: string, limit: number = 20): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { items: [], nextCursor: null };

        let query = supabase
            .from('activity')
            .select('*, profiles(*)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt('created_at', cursor);
        }

        const { data, error } = await query;
        if (error) throw error;

        const items = data.map(d => ({
            ...d,
            actor: d.profiles
        })) as ActivityItem[];

        return {
            items,
            nextCursor: data.length === limit ? data[data.length - 1].created_at : null
        };
    }

    async createActivity(type: ActivityItem['type'], payload: any, visibility: ActivityItem['visibility'] = 'followers'): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('activity')
            .insert({
                user_id: user.id,
                type,
                payload,
                visibility
            });

        if (error) throw error;
    }
}

export const activityService = ActivityService.getInstance();
