import { eventBus, Events } from '../events';
import { MediaItem, PlaybackState } from '../audio-sdk/models';
import { NativeAudioEngine } from './engines/NativeAudioEngine';

export class PlaybackManager {
    private static instance: PlaybackManager;
    private engineA: NativeAudioEngine;
    private engineB: NativeAudioEngine;
    private activeBuffer: 'A' | 'B' = 'A';

    private currentItem: MediaItem | null = null;
    private volume: number = 1.0;
    private isCrossfading: boolean = false;

    private constructor() {
        this.engineA = new NativeAudioEngine(this.createEngineEvents('A'));
        this.engineB = new NativeAudioEngine(this.createEngineEvents('B'));
    }

    public static getInstance(): PlaybackManager {
        if (!PlaybackManager.instance) {
            PlaybackManager.instance = new PlaybackManager();
        }
        return PlaybackManager.instance;
    }

    private createEngineEvents(buffer: 'A' | 'B') {
        return {
            onStateChange: (state: PlaybackState) => {
                if (this.activeBuffer === buffer) {
                    this.handleStateChange(state);
                }
            },
            onProgress: (current: number, total: number) => {
                if (this.activeBuffer === buffer) {
                    this.handleProgress(current, total);
                }
            },
            onEnded: () => {
                if (this.activeBuffer === buffer && !this.isCrossfading) {
                    this.handleEnded();
                }
            },
            onError: (err: Error) => {
                if (this.activeBuffer === buffer) {
                    this.handleError(err);
                }
            },
        };
    }

    private handleStateChange(state: PlaybackState) {
        switch (state) {
            case 'playing':
                eventBus.emit(Events.PLAYBACK_STARTED, this.currentItem);
                break;
            case 'paused':
                eventBus.emit(Events.PLAYBACK_PAUSED, this.currentItem);
                break;
            case 'buffering':
                eventBus.emit(Events.BUFFERING, this.currentItem);
                break;
        }
    }

    private handleProgress(currentTime: number, duration: number) {
        eventBus.emit(Events.PLAYBACK_PROGRESS, { currentTime, duration, item: this.currentItem });
    }

    private handleEnded() {
        eventBus.emit(Events.PLAYBACK_ENDED, this.currentItem);
    }

    private handleError(error: Error) {
        eventBus.emit(Events.PLAYBACK_ERROR, { error, item: this.currentItem });
    }

    public get activeEngine() {
        return this.activeBuffer === 'A' ? this.engineA : this.engineB;
    }

    public get inactiveEngine() {
        return this.activeBuffer === 'A' ? this.engineB : this.engineA;
    }

    async play(item: MediaItem) {
        if (this.currentItem?.id !== item.id) {
            this.currentItem = item;
            eventBus.emit(Events.TRACK_CHANGED, item);

            const url = item.stream?.url;
            if (url) {
                if (this.isCrossfading) {
                    this.engineA.stop();
                    this.engineB.stop();
                    this.isCrossfading = false;
                }
                await this.activeEngine.load(url);
            } else {
                throw new Error('No playable stream found for item');
            }
        }
        await this.activeEngine.play();
    }

    async startCrossfade(nextItem: MediaItem, duration: number) {
        if (this.isCrossfading) return;
        this.isCrossfading = true;

        const nextUrl = nextItem.stream?.url;
        if (!nextUrl) {
            this.isCrossfading = false;
            return;
        }

        const active = this.activeEngine;
        const inactive = this.inactiveEngine;

        await inactive.load(nextUrl);
        inactive.setVolume(0);
        await inactive.play();

        const steps = 20;
        const interval = (duration * 1000) / steps;
        let step = 0;

        const fade = setInterval(() => {
            step++;
            const progress = step / steps;
            active.setVolume(this.volume * (1 - progress));
            inactive.setVolume(this.volume * progress);

            if (step >= steps) {
                clearInterval(fade);
                active.stop();
                this.activeBuffer = this.activeBuffer === 'A' ? 'B' : 'A';
                this.currentItem = nextItem;
                this.isCrossfading = false;
                eventBus.emit(Events.TRACK_CHANGED, nextItem);
            }
        }, interval);
    }

    pause() {
        this.activeEngine.pause();
    }

    stop() {
        this.engineA.stop();
        this.engineB.stop();
        this.currentItem = null;
        this.isCrossfading = false;
    }

    seek(time: number) {
        this.activeEngine.seek(time);
    }

    setVolume(volume: number) {
        this.volume = volume;
        if (!this.isCrossfading) {
            this.engineA.setVolume(volume);
            this.engineB.setVolume(volume);
        }
    }

    get state() { return this.activeEngine.state; }
    get currentTime() { return this.activeEngine.currentTime; }
    get duration() { return this.activeEngine.duration; }
    get currentMediaItem() { return this.currentItem; }

    // Internal access for visualizer compatibility in Phase 1
    get _activeAudioElement() {
        return this.engineA.audioElement;
    }
    get _inactiveAudioElement() {
        return this.engineB.audioElement;
    }
}

export const playbackManager = PlaybackManager.getInstance();
