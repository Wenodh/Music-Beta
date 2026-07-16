import { eventBus, Events } from '../events';
import { MediaItem } from '../audio-sdk/models';
import debounce from 'lodash/debounce';
import {
    savePlaybackPosition,
    getPlaybackPosition,
    getAllPlaybackPositions,
    deletePlaybackPosition,
    StoredPlaybackPosition
} from '../../utils/db';

export interface PlaybackPosition {
    mediaId: string;
    provider: string;
    position: number;
    duration: number;
    updatedAt: number;
}

export class ContinuityService {
    private positions: Map<string, PlaybackPosition> = new Map();

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

        eventBus.on(Events.PLAYBACK_ENDED, (item) => {
            if (item) {
                this.clearPosition(item.id);
            }
        });
    }

    private async loadPositions() {
        try {
            // Load from IndexedDB
            const positions = await getAllPlaybackPositions();
            positions.forEach(p => this.positions.set(p.mediaId, p));

            // Legacy migration (one-time)
            const legacy = localStorage.getItem('vibeon_playback_positions');
            if (legacy) {
                const data: PlaybackPosition[] = JSON.parse(legacy);
                for (const p of data) {
                    if (!this.positions.has(p.mediaId)) {
                        this.positions.set(p.mediaId, p);
                        await savePlaybackPosition(p);
                    }
                }
                localStorage.removeItem('vibeon_playback_positions');
            }
        } catch (e) {
            logger.error('Failed to load playback positions', e);
        }
    }

    async updatePosition(item: MediaItem, position: number, duration: number) {
        const data: StoredPlaybackPosition = {
            mediaId: item.id,
            provider: item.provider,
            position,
            duration,
            updatedAt: Date.now()
        };

        this.positions.set(item.id, data);

        // Use a background task to save to IndexedDB to avoid blocking
        try {
            await savePlaybackPosition(data);
        } catch (e) {
            logger.error('Failed to save playback position', e);
        }
    }

    getPosition(mediaId: string): PlaybackPosition | undefined {
        return this.positions.get(mediaId);
    }

    async clearPosition(mediaId: string) {
        this.positions.delete(mediaId);
        try {
            await deletePlaybackPosition(mediaId);
        } catch (e) {
            logger.error('Failed to delete playback position', e);
        }
    }
}

export const continuityService = new ContinuityService();
