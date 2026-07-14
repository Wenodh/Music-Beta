import { PlaybackEngine, PlaybackState } from './types';
import { RemotePlaybackProvider, PlaybackDevice } from '../../platform/types';

export class RemotePlaybackEngine implements PlaybackEngine {
    id = 'remote';
    audioElement = new Audio(); // Still used as a dummy for some visualizers if needed

    private _state: PlaybackState = 'idle';
    private _currentTime: number = 0;
    private _duration: number = 0;
    private provider: RemotePlaybackProvider | null = null;

    constructor(private events: any) {
        this.setupNetworkListeners();
    }

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            if (this.provider) {
                // Attempt to re-sync or reconnect if needed
                logger.debug('[RemotePlaybackEngine] Network online, checking provider status');
            }
        });

        window.addEventListener('offline', () => {
            if (this._state === 'playing') {
                this.events.onError(new Error('Network disconnected. Playback might be interrupted.'));
            }
        });
    }

    public setProvider(provider: RemotePlaybackProvider) {
        this.provider = provider;
        this.provider.onEvent((event, data) => {
            switch (event) {
                case 'state':
                    this._state = data;
                    this.events.onStateChange(this._state);
                    break;
                case 'progress':
                    this._currentTime = data.currentTime;
                    this._duration = data.duration;
                    this.events.onProgress(this._currentTime, this._duration);
                    break;
                case 'ended':
                    this.events.onEnded();
                    break;
                case 'error':
                    this.events.onError(data);
                    break;
            }
        });
    }

    async load(item: any) {
        if (!this.provider) throw new Error('No remote provider set');
        this._state = 'buffering';
        this.events.onStateChange(this._state);
        await this.provider.load(item);
    }

    async play() {
        if (!this.provider) return;
        await this.provider.play();
    }

    async pause() {
        if (!this.provider) return;
        await this.provider.pause();
    }

    async stop() {
        if (!this.provider) return;
        await this.provider.disconnect();
        this._state = 'idle';
        this.events.onStateChange(this._state);
    }

    async seek(time: number) {
        if (!this.provider) return;
        await this.provider.seek(time);
    }

    async setVolume(volume: number) {
        if (!this.provider) return;
        await this.provider.setVolume(volume);
    }

    async setPlaybackSpeed(speed: number) {
        if (this.provider?.setPlaybackSpeed) {
            await this.provider.setPlaybackSpeed(speed);
        }
    }

    get state() { return this._state; }
    get currentTime() { return this._currentTime; }
    get duration() { return this._duration; }

    // Sync queue and metadata if needed by provider
    public async syncQueue(queue: any[]) {
        if ((this.provider as any).syncQueue) {
            await (this.provider as any).syncQueue(queue);
        }
    }
}
