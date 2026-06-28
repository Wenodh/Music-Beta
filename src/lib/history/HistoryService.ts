import { eventBus, Events } from '../events';
import { MediaItem } from '../audio-sdk/models';
import { store } from '../../store';
import { updateHistoryDuration, addToHistory } from '../../features/musicplayer/musicPlayerSlice';
import { getHistoryPolicy } from '../policies/HistoryPolicy';

export class HistoryService {
    private static instance: HistoryService;
    private currentItem: MediaItem | null = null;
    private startTime: number = 0;
    private heartbeatInterval: number | null = null;
    private accumulatedDuration: number = 0;

    private constructor() {
        this.init();
    }

    public static getInstance(): HistoryService {
        if (!HistoryService.instance) {
            HistoryService.instance = new HistoryService();
        }
        return HistoryService.instance;
    }

    private init() {
        eventBus.on(Events.PLAYBACK_STARTED, (item: MediaItem) => this.handlePlaybackStarted(item));
        eventBus.on(Events.PLAYBACK_PAUSED, () => this.handlePlaybackStopped());
        eventBus.on(Events.PLAYBACK_STOPPED, () => this.handlePlaybackStopped());
        eventBus.on(Events.PLAYBACK_ENDED, () => this.handlePlaybackStopped());

        // Final save on app unload
        window.addEventListener('beforeunload', () => this.handlePlaybackStopped());
    }

    private handlePlaybackStarted(item: MediaItem) {
        if (this.currentItem?.id === item.id) return;

        // Save previous item if any
        if (this.currentItem) {
            this.handlePlaybackStopped();
        }

        const policy = getHistoryPolicy(item);
        if (!policy.shouldStoreHistory) return;

        this.currentItem = item;
        this.startTime = Date.now();
        this.accumulatedDuration = 0;

        // Initialize history entry
        store.dispatch(addToHistory({
            id: item.id,
            media: item,
            playedAt: new Date().toISOString(),
            listenedDuration: 0
        }));

        this.startHeartbeat();
    }

    private handlePlaybackStopped() {
        if (!this.currentItem) return;

        this.stopHeartbeat();
        this.updateDuration();

        this.currentItem = null;
        this.accumulatedDuration = 0;
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = window.setInterval(() => {
            this.updateDuration();
        }, 30000); // 30 seconds heartbeat
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            window.clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private updateDuration() {
        if (!this.currentItem) return;

        const now = Date.now();
        const sessionDuration = Math.floor((now - this.startTime) / 1000);
        const delta = sessionDuration - this.accumulatedDuration;

        if (delta > 0) {
            store.dispatch(updateHistoryDuration({
                id: this.currentItem.id,
                duration: delta
            }));
            this.accumulatedDuration = sessionDuration;
        }
    }
}

export const historyService = HistoryService.getInstance();
