import { MediaItem } from '../../audio-sdk/models';
import { audioSDK } from '../../audio-sdk';

export interface SearchIntent {
    query: string;
    genres: string[];
    moods: string[];
    type?: string;
}

export class SmartSearchService {
    private static instance: SmartSearchService;

    private constructor() {}

    public static getInstance(): SmartSearchService {
        if (!SmartSearchService.instance) {
            SmartSearchService.instance = new SmartSearchService();
        }
        return SmartSearchService.instance;
    }

    async search(query: string): Promise<MediaItem[]> {
        const intent = this.detectIntent(query);

        // Use intent to broaden search or filter
        let searchQuery = intent.query;
        if (intent.genres.length > 0) {
            searchQuery = `${intent.genres[0]} ${searchQuery}`.trim();
        }

        const results = await audioSDK.search(searchQuery);

        // Basic ranking enhancement: move items that match intent genres to top
        return results.sort((a, b) => {
            const aMatch = a.genres?.some(g => intent.genres.includes(g.toLowerCase())) ? 1 : 0;
            const bMatch = b.genres?.some(g => intent.genres.includes(g.toLowerCase())) ? 1 : 0;
            return bMatch - aMatch;
        });
    }

    private detectIntent(query: string): SearchIntent {
        const lower = query.toLowerCase();
        const intent: SearchIntent = {
            query,
            genres: [],
            moods: []
        };

        const genreKeywords = ['piano', 'rock', 'pop', 'jazz', 'classical', 'ambient', 'lofi', 'techno'];
        const moodKeywords = ['relax', 'chill', 'workout', 'focus', 'sleep'];

        genreKeywords.forEach(k => {
            if (lower.includes(k)) intent.genres.push(k);
        });

        moodKeywords.forEach(k => {
            if (lower.includes(k)) intent.moods.push(k);
        });

        // Remove keywords from query to get the "topic"
        intent.query = query; // Simplified

        return intent;
    }
}

export const smartSearchService = SmartSearchService.getInstance();
