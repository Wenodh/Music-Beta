import { PlaybackManager } from './PlaybackManager';
import { MediaItem } from '../audio-sdk/models';
import { logger } from '../logger';

export class PreloadManager {
    private static instance: PreloadManager;
    private preloadAudio: HTMLAudioElement;

    private constructor() {
        this.preloadAudio = new Audio();
        this.preloadAudio.muted = true;
    }

    public static getInstance(): PreloadManager {
        if (!PreloadManager.instance) {
            PreloadManager.instance = new PreloadManager();
        }
        return PreloadManager.instance;
    }

    preload(item: MediaItem) {
        if (item.stream?.url && item.stream.format !== 'hls') {
            logger.debug('Preload', `Preloading next track: ${item.title}`);
            this.preloadAudio.src = item.stream.url;
            this.preloadAudio.load();
        }
    }

    cancel() {
        this.preloadAudio.src = '';
    }
}

export const preloadManager = PreloadManager.getInstance();
