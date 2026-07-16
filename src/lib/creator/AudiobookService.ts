import { supabase } from '../supabase';
import { MediaItem } from '../audio-sdk/models';

export interface Audiobook {
    id: string;
    organizationId: string;
    title: string;
    author: string;
    narrator: string[];
    description: string;
    artworkUrl: string;
    status: 'draft' | 'published';
}

export class AudiobookService {
    private static instance: AudiobookService;

    private constructor() {}

    public static getInstance(): AudiobookService {
        if (!AudiobookService.instance) {
            AudiobookService.instance = new AudiobookService();
        }
        return AudiobookService.instance;
    }

    async createBook(book: Partial<Audiobook>): Promise<Audiobook> {
        const { data, error } = await supabase
            .from('creator_audiobooks')
            .insert(book)
            .select()
            .single();

        if (error) throw error;
        return data as Audiobook;
    }

    async getChapters(bookId: string): Promise<MediaItem[]> {
        const { data, error } = await supabase
            .from('media_items')
            .select('*')
            .eq('metadata->book_id', bookId)
            .order('metadata->sequence_number', { ascending: true });

        if (error) throw error;
        return data as MediaItem[];
    }
}

export const audiobookService = AudiobookService.getInstance();
