import { supabase } from '../supabase';

export interface Comment {
    id: string;
    mediaId: string;
    userId: string;
    text: string;
    status: 'pending' | 'approved' | 'hidden' | 'deleted';
    createdAt: string;
}

export class CommentService {
    private static instance: CommentService;

    private constructor() {}

    public static getInstance(): CommentService {
        if (!CommentService.instance) {
            CommentService.instance = new CommentService();
        }
        return CommentService.instance;
    }

    async addComment(mediaId: string, text: string): Promise<Comment> {
        const { data, error } = await supabase
            .from('media_comments')
            .insert({ media_id: mediaId, text })
            .select()
            .single();

        if (error) throw error;
        return data as Comment;
    }

    async moderateComment(commentId: string, status: Comment['status']) {
        const { error } = await supabase
            .from('media_comments')
            .update({ status })
            .eq('id', commentId);

        if (error) throw error;
    }
}

export const commentService = CommentService.getInstance();
