import { supabase } from '../supabase';

export interface ModerationReport {
    id: string;
    targetId: string;
    targetType: 'creator' | 'media' | 'comment';
    reporterId: string;
    reason: string;
    status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
    createdAt: string;
}

export class ModerationService {
    private static instance: ModerationService;

    private constructor() {}

    public static getInstance(): ModerationService {
        if (!ModerationService.instance) {
            ModerationService.instance = new ModerationService();
        }
        return ModerationService.instance;
    }

    async reportContent(targetId: string, targetType: ModerationReport['targetType'], reason: string) {
        const { error } = await supabase
            .from('moderation_reports')
            .insert({ target_id: targetId, target_type: targetType, reason });

        if (error) throw error;
    }

    async getQueue(): Promise<ModerationReport[]> {
        const { data, error } = await supabase
            .from('moderation_reports')
            .select('*')
            .eq('status', 'open');

        if (error) throw error;
        return data as ModerationReport[];
    }
}

export const moderationService = ModerationService.getInstance();
