import { MediaItem } from '../../audio-sdk/models';
import { Recommendation } from '../types';
import { recommendationService } from '../RecommendationService';
import { tasteProfileService } from '../TasteProfileService';
import { audioSDK } from '../../audio-sdk';

export interface RecommendationModule {
    id: string;
    title: string;
    priority: number;
    load(): Promise<Recommendation[]>;
}

export class DailyMixModule implements RecommendationModule {
    id = 'daily-mix';
    title = 'Daily Mix';
    priority = 10;

    async load(): Promise<Recommendation[]> {
        const profile = tasteProfileService.getProfile();
        if (!profile) return [];

        // For Daily Mix, we fetch trending or favorite-adjacent items and rank them
        const candidates = await audioSDK.getTrendingRadio(); // Fallback for Phase 6
        return recommendationService.recommend(candidates, profile, this.id);
    }
}

export class DiscoveryModule implements RecommendationModule {
    id = 'discovery';
    title = 'Discover Something New';
    priority = 20;

    async load(): Promise<Recommendation[]> {
        const profile = tasteProfileService.getProfile();
        if (!profile) return [];

        const candidates = await audioSDK.getPopularRadio(); // Placeholder
        return recommendationService.recommend(candidates, profile, this.id);
    }
}
