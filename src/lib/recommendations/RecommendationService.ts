import { MediaItem } from '../audio-sdk/models';
import { Recommendation, TasteProfile, RecommendationReason } from './types';
import { FeatureExtractor, GenreAffinityExtractor, ArtistAffinityExtractor } from './extractors';

export class RecommendationService {
    private static instance: RecommendationService;
    private extractors: FeatureExtractor[] = [
        new GenreAffinityExtractor(),
        new ArtistAffinityExtractor()
    ];

    private constructor() {}

    public static getInstance(): RecommendationService {
        if (!RecommendationService.instance) {
            RecommendationService.instance = new RecommendationService();
        }
        return RecommendationService.instance;
    }

    async recommend(candidates: MediaItem[], profile: TasteProfile, module: string): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        for (const media of candidates) {
            const reasons: RecommendationReason[] = [];
            let totalScore = 0;
            let totalWeight = 0;

            // Simplified weighted scoring for Phase 6
            const weights: Record<string, number> = {
                'genre_affinity': 0.6,
                'artist_affinity': 0.4
            };

            for (const extractor of this.extractors) {
                const result = await extractor.extract(media, profile);
                const weight = weights[extractor.name] || 0.1;

                totalScore += result.score * weight;
                totalWeight += weight;

                if (result.reason) {
                    reasons.push(result.reason);
                }
            }

            const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

            if (finalScore > 0.1) {
                recommendations.push({
                    id: `${module}_${media.id}`,
                    media,
                    score: finalScore,
                    reasons: reasons.slice(0, 2),
                    module
                });
            }
        }

        return recommendations.sort((a, b) => b.score - a.score);
    }
}

export const recommendationService = RecommendationService.getInstance();
