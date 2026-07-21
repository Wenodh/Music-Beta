import { supabase } from '../supabase';
import { CreatorAnalytics } from '../../features/creator/types';

export class AnalyticsService {
    private static instance: AnalyticsService;

    private constructor() {}

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    async getStats(mediaId: string, period: CreatorAnalytics['period']): Promise<CreatorAnalytics[]> {
        const { data, error } = await supabase
            .from('creator_analytics')
            .select('*')
            .eq('media_id', mediaId)
            .eq('period', period)
            .order('date', { ascending: true });

        if (error) throw error;
        return data as CreatorAnalytics[];
    }

    async getOrganizationStats(orgId: string, period: CreatorAnalytics['period']): Promise<any> {
        // Aggregate stats for all media in an organization
        return {};
    }
}

export const analyticsService = AnalyticsService.getInstance();
