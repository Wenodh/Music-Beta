import { TasteProfile, ListeningEvent, GenreAffinity, ArtistAffinity } from './types';
import { db } from '../storage/db';
import { StorageService } from '../storage/StorageService';
import { eventBus, Events } from '../events';
import { MediaItem } from '../audio-sdk/models';

export class TasteProfileService {
    private static instance: TasteProfileService;
    private profile: TasteProfile | null = null;

    private constructor() {
        this.init();
    }

    public static getInstance(): TasteProfileService {
        if (!TasteProfileService.instance) {
            TasteProfileService.instance = new TasteProfileService();
        }
        return TasteProfileService.instance;
    }

    private async init() {
        const saved = await StorageService.getItem<TasteProfile>('user_taste_profile');
        if (saved) {
            this.profile = saved;
        } else {
            this.profile = this.createEmptyProfile();
        }

        // Listen for playback events to track
        eventBus.on(Events.PLAYBACK_STARTED, (item: MediaItem) => this.trackEvent(item, 'play'));
        eventBus.on(Events.PLAYBACK_ENDED, (item: MediaItem) => this.trackEvent(item, 'complete'));
    }

    private createEmptyProfile(): TasteProfile {
        return {
            topGenres: [],
            topArtists: [],
            preferredLanguages: [],
            listeningTimeTotal: 0,
            skipRate: 0,
            averageCompletionRate: 0,
            timeOfDayAffinity: {},
            lastUpdated: new Date().toISOString(),
            version: 1
        };
    }

    async trackEvent(media: MediaItem, action: ListeningEvent['action'], duration: number = 0) {
        const event: ListeningEvent = {
            id: crypto.randomUUID(),
            mediaId: media.id,
            provider: media.provider,
            type: media.type,
            action,
            timestamp: new Date().toISOString(),
            duration,
            metadata: media
        };

        await db.listeningEvents.put({
            id: event.id,
            mediaId: event.mediaId,
            action: event.action,
            timestamp: new Date(event.timestamp).getTime(),
            data: event
        });

        await this.updateProfile(event);
    }

    private async updateProfile(event: ListeningEvent) {
        if (!this.profile) return;

        const media = event.metadata as MediaItem;

        // 1. Update Genres
        if (media.genres) {
            media.genres.forEach(genre => {
                const existing = this.profile!.topGenres.find(g => g.genre === genre);
                if (existing) {
                    existing.count++;
                    existing.score += event.action === 'complete' ? 1 : 0.5;
                } else {
                    this.profile!.topGenres.push({ genre, count: 1, score: 0.5 });
                }
            });
        }

        // 2. Update Artists
        const artistName = media.subtitle; // Simplified for this phase
        if (artistName) {
            const existing = this.profile.topArtists.find(a => a.name === artistName);
            if (existing) {
                existing.count++;
                existing.score += event.action === 'complete' ? 1 : 0.5;
            } else {
                this.profile.topArtists.push({ id: '', name: artistName, count: 1, score: 0.5 });
            }
        }

        // 3. Update Time of Day
        const hour = new Date(event.timestamp).getHours();
        this.profile.timeOfDayAffinity[hour] = (this.profile.timeOfDayAffinity[hour] || 0) + 1;

        this.profile.lastUpdated = new Date().toISOString();
        await StorageService.setItem('user_taste_profile', this.profile);
    }

    getProfile(): TasteProfile | null {
        return this.profile;
    }

    async resetProfile() {
        this.profile = this.createEmptyProfile();
        await StorageService.setItem('user_taste_profile', this.profile);
        await db.listeningEvents.clear();
    }
}

export const tasteProfileService = TasteProfileService.getInstance();
