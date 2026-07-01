import { supabase } from '../supabase';

export class RSSFeedService {
    private static instance: RSSFeedService;

    private constructor() {}

    public static getInstance(): RSSFeedService {
        if (!RSSFeedService.instance) {
            RSSFeedService.instance = new RSSFeedService();
        }
        return RSSFeedService.instance;
    }

    public getFeedUrl(showId: string): string {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        return `${supabaseUrl}/functions/v1/podcast-rss?id=${showId}`;
    }

    async validateFeed(showId: string): Promise<boolean> {
        // Logic to trigger a validation check via Edge Function
        return true;
    }
}

export const rssFeedService = RSSFeedService.getInstance();
