import { supabase } from '../supabase';
import { MediaItem } from '../audio-sdk/models';
import { PublishingDraft } from '../../features/creator/types';

export class PublishingService {
    private static instance: PublishingService;

    private constructor() {}

    public static getInstance(): PublishingService {
        if (!PublishingService.instance) {
            PublishingService.instance = new PublishingService();
        }
        return PublishingService.instance;
    }

    async saveDraft(draft: Partial<PublishingDraft>): Promise<PublishingDraft> {
        const { data, error } = await supabase
            .from('creator_drafts')
            .upsert({
                ...draft,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data as PublishingDraft;
    }

    async publish(draftId: string): Promise<MediaItem> {
        // Asynchronous publishing via Edge Function
        const { data, error } = await supabase.functions.invoke('publish-media', {
            body: { draftId }
        });

        if (error) throw error;
        return data as MediaItem;
    }

    async schedulePublish(draftId: string, publishAt: string) {
        const { error } = await supabase
            .from('creator_drafts')
            .update({ status: 'ready', schedule_at: publishAt })
            .eq('id', draftId);

        if (error) throw error;
    }
}

export const publishingService = PublishingService.getInstance();
