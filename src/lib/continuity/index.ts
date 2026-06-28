import { eventBus, Events } from '../events';
import { MediaItem } from '../audio-sdk/models';
import debounce from 'lodash/debounce';

export interface PlaybackPosition {
    mediaId: string;
    provider: string;
    position: number;
    duration: number;
    updatedAt: number;
}

export class ContinuityService {
    private static STORAGE_KEY = 'vibeon_playback_positions';
    private positions: Map<string, PlaybackPosition> = new Map();

    private debouncedSave = debounce(() => this.savePositions(), 2000);

    constructor() {
        this.loadPositions();
        this.setupListeners();
    }

    private setupListeners() {
        eventBus.on(Events.PLAYBACK_PROGRESS, ({ currentTime, duration, item }) => {
            if (item) {
                this.updatePosition(item, currentTime, duration);
            }
        });
    }

    private loadPositions() {
        try {
            const stored = localStorage.getItem(ContinuityService.STORAGE_KEY);
            if (stored) {
                const data: PlaybackPosition[] = JSON.parse(stored);
                data.forEach(p => this.positions.set(p.mediaId, p));
            }
        } catch (e) {
            console.error('Failed to load playback positions', e);
        }
    }

    private savePositions() {
        try {
            const data = Array.from(this.positions.values()).slice(-50); // Keep last 50 for storage sanity
            localStorage.setItem(ContinuityService.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save playback positions', e);
        }
    }

    updatePosition(item: MediaItem, position: number, duration: number) {
        this.positions.set(item.id, {
            mediaId: item.id,
            provider: item.provider,
            position,
            duration,
            updatedAt: Date.now()
        });

        this.debouncedSave();
    }

    getPosition(mediaId: string): PlaybackPosition | undefined {
        return this.positions.get(mediaId);
    }

    clearPosition(mediaId: string) {
        this.positions.delete(mediaId);
        this.savePositions();
    }
}

export const continuityService = new ContinuityService();
