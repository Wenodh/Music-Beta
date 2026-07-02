import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationService } from './RecommendationService';
import { MediaItem } from '../audio-sdk/models';
import { TasteProfile } from './types';

describe('RecommendationService', () => {
    let service: RecommendationService;

    beforeEach(() => {
        service = RecommendationService.getInstance();
    });

    it('should be a singleton', () => {
        const i1 = RecommendationService.getInstance();
        const i2 = RecommendationService.getInstance();
        expect(i1).toBe(i2);
    });

    it('should return recommendations based on profile', async () => {
        const mockItem: MediaItem = {
            id: 'rec-1',
            title: 'Rec Track',
            provider: 'test',
            type: 'song',
            metadata: { genres: ['Pop'] },
            artwork: [],
            playable: true
        } as any;

        const profile: TasteProfile = {
            userId: 'u1',
            topGenres: [{ name: 'Pop', score: 1.0 }],
            topArtists: [],
            recentAffinities: [],
            lastUpdated: ''
        };

        const results = await service.recommend([mockItem], profile, 'test_module');
        expect(results).toBeDefined();
    });
});
