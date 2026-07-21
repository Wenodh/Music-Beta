import { logger } from "../logger";
type Handler<T = any> = (event: T) => void;

export class EventBus {
    private handlers: Map<string, Set<Handler>> = new Map();

    on<T = any>(type: string, handler: Handler<T>): void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler);
    }

    off<T = any>(type: string, handler: Handler<T>): void {
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    emit<T = any>(type: string, event: T): void {
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (e) {
                    logger.error(`Error in event handler for ${type}:`, e);
                }
            });
        }
    }
}

export const eventBus = new EventBus();

// Event Type Constants
export const Events = {
    PLAYBACK_STARTED: 'playback:started',
    PLAYBACK_PAUSED: 'playback:paused',
    PLAYBACK_STOPPED: 'playback:stopped',
    PLAYBACK_ENDED: 'playback:ended',
    PLAYBACK_ERROR: 'playback:error',
    PLAYBACK_PROGRESS: 'playback:progress',
    TRACK_CHANGED: 'track:changed',
    QUEUE_CHANGED: 'queue:changed',
    BUFFERING: 'playback:buffering',
    PLAYBACK_METADATA_UPDATE: 'playback:metadata:update',
    BOOKMARK_ADDED: 'bookmark:added',
    BOOKMARK_REMOVED: 'bookmark:removed',
} as const;
