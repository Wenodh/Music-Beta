import { tasteProfileService } from './TasteProfileService';
import { db } from '../storage/db';

export interface ListeningStats {
    totalHours: number;
    topGenre: string;
    topArtist: string;
    streakDays: number;
    completionRate: number;
}

export class InsightsService {
    static async getStats(): Promise<ListeningStats> {
        const profile = tasteProfileService.getProfile();
        if (!profile) return { totalHours: 0, topGenre: 'None', topArtist: 'None', streakDays: 0, completionRate: 0 };

        const sortedGenres = [...profile.topGenres].sort((a, b) => b.score - a.score);
        const sortedArtists = [...profile.topArtists].sort((a, b) => b.score - a.score);

        // Calculate streak from events (simplified)
        const events = await db.listeningEvents.orderBy('timestamp').toArray();
        let streak = 0;
        if (events.length > 0) {
            streak = 1; // Logic for real streak would go here
        }

        return {
            totalHours: Math.round(profile.listeningTimeTotal / 3600),
            topGenre: sortedGenres[0]?.genre || 'None',
            topArtist: sortedArtists[0]?.name || 'None',
            streakDays: streak,
            completionRate: Math.round(profile.averageCompletionRate * 100)
        };
    }
}
