import { MediaItem } from '../audio-sdk/models';
import { Recommendation } from './types';
import { tasteProfileService } from './TasteProfileService';

export interface AIResponse {
    text: string;
    suggestions?: string[];
    media?: MediaItem[];
}

export class AIAssistant {
    private static instance: AIAssistant;

    private constructor() {}

    public static getInstance(): AIAssistant {
        if (!AIAssistant.instance) {
            AIAssistant.instance = new AIAssistant();
        }
        return AIAssistant.instance;
    }

    async ask(query: string): Promise<AIResponse> {
        // Placeholder for future LLM integration
        const profile = tasteProfileService.getProfile();

        return {
            text: `I'm your Vibe On AI. In the future, I'll be able to help you discover new music based on your taste for ${profile?.topGenres[0]?.genre || 'various genres'}.`,
            suggestions: ['Recommend some jazz', 'What are my top artists?', 'Create a workout mix']
        };
    }

    getRecommendationExplanation(rec: Recommendation): string {
        if (rec.reasons.length === 0) return "Recommended based on overall trending content.";
        return rec.reasons.map(r => r.message).join(' and ');
    }
}

export const aiAssistant = AIAssistant.getInstance();
