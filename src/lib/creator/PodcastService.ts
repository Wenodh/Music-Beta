import { supabase } from '../supabase';
import { MediaItem } from '../audio-sdk/models';

export interface PodcastShow {
    id: string;
    organizationId: string;
    title: string;
    description: string;
    artworkUrl: string;
    category: string;
    language: string;
    explicit: boolean;
    status: 'draft' | 'published';
}

export class PodcastService {
    private static instance: PodcastService;

    private constructor() {}

    public static getInstance(): PodcastService {
        if (!PodcastService.instance) {
            PodcastService.instance = new PodcastService();
        }
        return PodcastService.instance;
    }

    async createShow(show: Partial<PodcastShow>): Promise<PodcastShow> {
        const { data, error } = await supabase
            .from('creator_podcasts')
            .insert(show)
            .select()
            .single();

        if (error) throw error;
        return data as PodcastShow;
    }

    async getEpisodes(showId: string): Promise<MediaItem[]> {
        const { data, error } = await supabase
            .from('media_items')
            .select('*')
            .eq('metadata->podcast_id', showId)
            .order('published_at', { ascending: false });

        if (error) throw error;
        return data as MediaItem[];
    }
}

export const podcastService = PodcastService.getInstance();
