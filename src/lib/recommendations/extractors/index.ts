import { MediaItem } from '../../audio-sdk/models';
import { TasteProfile, RecommendationReason } from '../types';

export interface ExtractorResult {
    score: number;
    reason?: RecommendationReason;
}

export interface FeatureExtractor {
    name: string;
    extract(media: MediaItem, profile: TasteProfile): Promise<ExtractorResult>;
}

export class GenreAffinityExtractor implements FeatureExtractor {
    name = 'genre_affinity';
    async extract(media: MediaItem, profile: TasteProfile): Promise<ExtractorResult> {
        if (!media.genres || media.genres.length === 0) return { score: 0 };

        let maxGenreScore = 0;
        let bestGenre = '';

        media.genres.forEach(g => {
            const affinity = profile.topGenres.find(tg => tg.genre === g);
            if (affinity && affinity.score > maxGenreScore) {
                maxGenreScore = affinity.score;
                bestGenre = g;
            }
        });

        const normalizedScore = Math.min(maxGenreScore / 10, 1);

        return {
            score: normalizedScore,
            reason: normalizedScore > 0.3 ? {
                type: 'genre',
                message: `Because you listen to ${bestGenre}`
            } : undefined
        };
    }
}

export class ArtistAffinityExtractor implements FeatureExtractor {
    name = 'artist_affinity';
    async extract(media: MediaItem, profile: TasteProfile): Promise<ExtractorResult> {
        const artist = media.subtitle;
        if (!artist) return { score: 0 };

        const affinity = profile.topArtists.find(a => a.name === artist);
        if (!affinity) return { score: 0 };

        const normalizedScore = Math.min(affinity.score / 5, 1);

        return {
            score: normalizedScore,
            reason: normalizedScore > 0.3 ? {
                type: 'artist',
                message: `Because you like ${artist}`
            } : undefined
        };
    }
}
