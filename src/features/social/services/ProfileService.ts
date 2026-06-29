import { supabase } from '../../../lib/supabase';
import { UserProfile, ListeningStats } from '../types';
import { tasteProfileService } from '../../../lib/recommendations/TasteProfileService';
import { syncManager } from '../../../lib/sync/SyncManager';
import { StorageService } from '../../../lib/storage/StorageService';

export class ProfileService {
    private static instance: ProfileService;

    private constructor() {}

    public static getInstance(): ProfileService {
        if (!ProfileService.instance) {
            ProfileService.instance = new ProfileService();
        }
        return ProfileService.instance;
    }

    async getProfile(userId: string): Promise<UserProfile | null> {
        // Try cache first
        const cached = await StorageService.getItem<UserProfile>(`profile_${userId}`);
        if (cached && (new Date().getTime() - new Date(cached.updatedAt).getTime() < 300000)) {
            return cached;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) return null;

        const profile = this.mapFromDb(data);
        await StorageService.setItem(`profile_${userId}`, profile);
        return profile;
    }

    async updateProfile(profile: Partial<UserProfile>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Enqueue sync operation
        await syncManager.enqueue('profile', 'update', {
            ...profile,
            id: user.id
        });
    }

    async deriveStatsFromTasteProfile(): Promise<ListeningStats> {
        const taste = tasteProfileService.getProfile();
        if (!taste) return { totalTime: 0, topGenres: [], topArtists: [], milestones: [] };

        return {
            totalTime: taste.listeningTimeTotal,
            topGenres: taste.topGenres.map(g => ({ genre: g.genre, score: g.score })),
            topArtists: taste.topArtists.map(a => ({ name: a.name, score: a.score })),
            milestones: [] // To be calculated based on thresholds
        };
    }

    async syncTasteProfileToSocial(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const stats = await this.deriveStatsFromTasteProfile();
        const taste = tasteProfileService.getProfile();

        await this.updateProfile({
            id: user.id,
            favoriteGenres: taste?.topGenres.slice(0, 5).map(g => g.genre) || [],
            listeningStats: stats
        });
    }

    async isUsernameAvailable(username: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.toLowerCase())
            .maybeSingle();

        return !data;
    }

    private mapFromDb(data: any): UserProfile {
        return {
            id: data.id,
            username: data.username,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
            bio: data.bio,
            favoriteGenres: data.favorite_genres || [],
            listeningStats: data.listening_stats,
            privacySettings: data.privacy_settings,
            badges: data.badges || [],
            isOnboarded: data.is_onboarded,
            updatedAt: data.updated_at,
            createdAt: data.created_at
        };
    }
}

export const profileService = ProfileService.getInstance();
