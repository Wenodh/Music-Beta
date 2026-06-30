import { eventBus, Events } from '../events';
import { MediaItem, PlaybackState } from '../audio-sdk/models';
import { NativeAudioEngine } from './engines/NativeAudioEngine';
import { HLSAudioEngine } from './engines/HLSAudioEngine';
import { RemotePlaybackEngine } from './engines/RemotePlaybackEngine';
import { PlaybackEngine } from './engines/types';
import { RemotePlaybackProvider } from '../platform/types';

export class PlaybackManager {
    private static instance: PlaybackManager;
    private engineA: PlaybackEngine;
    private engineB: PlaybackEngine;
    private remoteEngine: RemotePlaybackEngine | null = null;
    private activeBuffer: 'A' | 'B' | 'remote' = 'A';

    private currentItem: MediaItem | null = null;
    private volume: number = 1.0;
    private isCrossfading: boolean = false;

    private constructor() {
        this.engineA = new NativeAudioEngine(this.createEngineEvents('A'));
        this.engineB = new NativeAudioEngine(this.createEngineEvents('B'));
        this.setupInterruptionHandlers();
    }

    private setupInterruptionHandlers() {
        // Handle headphone unplug / audio output change
        if (navigator.mediaSession) {
            // Some browsers support this via Media Session actions or events
        }

        // Generic event for audio destination change
        if (typeof (window as any).AudioContext !== 'undefined') {
            // Can listen to state changes
        }

        // We can also listen for the 'pause' event on the audio element
        // which often fires when headphones are unplugged.
        this.engineA.audioElement.addEventListener('pause', () => {
            if (this.activeBuffer === 'A' && this.state === 'playing') {
                // Potential interruption
                eventBus.emit('PLAYBACK_INTERRUPTED', 'Headphones disconnected or system pause');
            }
        });

        this.engineB.audioElement.addEventListener('pause', () => {
            if (this.activeBuffer === 'B' && this.state === 'playing') {
                eventBus.emit('PLAYBACK_INTERRUPTED', 'Headphones disconnected or system pause');
            }
        });
    }

    public setRemoteMode(provider: RemotePlaybackProvider | null) {
        if (provider) {
            if (!this.remoteEngine) {
                this.remoteEngine = new RemotePlaybackEngine(this.createEngineEvents('remote'));
            }
            this.remoteEngine.setProvider(provider);
            this.activeBuffer = 'remote';
        } else {
            this.activeBuffer = 'A';
        }
        eventBus.emit(Events.PLAYBACK_STATE_CHANGED, this.state);
    }

    private updateEngine(buffer: 'A' | 'B', format: 'mp3' | 'aac' | 'hls') {
        const events = this.createEngineEvents(buffer);
        const currentEngine = buffer === 'A' ? this.engineA : this.engineB;
        const audioElement = currentEngine.audioElement;

        if (format === 'hls') {
            if (currentEngine.id !== 'hls') {
                currentEngine.stop();
                const newEngine = new HLSAudioEngine(events, audioElement);
                if (buffer === 'A') this.engineA = newEngine;
                else this.engineB = newEngine;
            }
        } else {
            if (currentEngine.id !== 'native') {
                currentEngine.stop();
                const newEngine = new NativeAudioEngine(events, audioElement);
                if (buffer === 'A') this.engineA = newEngine;
                else this.engineB = newEngine;
            }
        }
    }

    public static getInstance(): PlaybackManager {
        if (!PlaybackManager.instance) {
            PlaybackManager.instance = new PlaybackManager();
        }
        return PlaybackManager.instance;
    }

    private createEngineEvents(buffer: 'A' | 'B' | 'remote') {
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
        if (this.activeBuffer === 'remote') return this.remoteEngine!;
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
            const format = item.stream?.format || 'mp3';
            if (url) {
                if (this.isCrossfading) {
                    this.engineA.stop();
                    this.engineB.stop();
                    this.isCrossfading = false;
                }
                if (this.activeBuffer !== 'remote') {
                    this.updateEngine(this.activeBuffer, format);
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
        const nextFormat = nextItem.stream?.format || 'mp3';
        if (!nextUrl) {
            this.isCrossfading = false;
            return;
        }

        const active = this.activeEngine;
        const inactiveBuffer = this.activeBuffer === 'A' ? 'B' : 'A';
        this.updateEngine(inactiveBuffer, nextFormat);
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

    setPlaybackSpeed(speed: number) {
        this.engineA.setPlaybackSpeed(speed);
        this.engineB.setPlaybackSpeed(speed);
    }

    get state() { return this.activeEngine.state; }
    get currentTime() { return this.activeEngine.currentTime; }
    get duration() { return this.activeEngine.duration; }
    get currentMediaItem() { return this.currentItem; }

    public syncRemoteQueue(queue: MediaItem[]) {
        if (this.activeBuffer === 'remote' && this.remoteEngine) {
            this.remoteEngine.syncQueue(queue);
        }
    }

    // Internal access for visualizer compatibility
    get _activeAudioElement() {
        return this.activeEngine.audioElement;
    }
    get _inactiveAudioElement() {
        return this.inactiveEngine.audioElement;
    }
}

export const playbackManager = PlaybackManager.getInstance();
