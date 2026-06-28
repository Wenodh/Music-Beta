import { PlaybackEngine, PlaybackEngineEvents } from './types';
import { PlaybackState } from '../../audio-sdk/models';

export class NativeAudioEngine implements PlaybackEngine {
    readonly id = 'native';
    private audio: HTMLAudioElement;
    private events: PlaybackEngineEvents;
    private _state: PlaybackState = 'idle';

    constructor(events: PlaybackEngineEvents, audio?: HTMLAudioElement) {
        this.events = events;
        this.audio = audio || new Audio();
        this.audio.crossOrigin = 'anonymous';
        this.setupListeners();
    }

    private setupListeners() {
        this.audio.onplay = () => this.updateState('playing');
        this.audio.onpause = () => this.updateState('paused');
        this.audio.onwaiting = () => this.updateState('buffering');
        this.audio.onplaying = () => this.updateState('playing');
        this.audio.onended = () => {
            this.updateState('ended');
            this.events.onEnded();
        };
        this.audio.onerror = (e) => {
            this.updateState('error');
            this.events.onError(e);
        };
        this.audio.ontimeupdate = () => {
            this.events.onProgress(this.audio.currentTime, this.audio.duration || 0);
        };
    }

    private updateState(state: PlaybackState) {
        this._state = state;
        this.events.onStateChange(state);
    }

    async load(url: string): Promise<void> {
        this.audio.src = url;
        this.audio.load();
    }

    async play(): Promise<void> {
        return this.audio.play();
    }

    pause(): void {
        this.audio.pause();
    }

    stop(): void {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.src = '';
        this.updateState('idle');
    }

    seek(time: number): void {
        this.audio.currentTime = time;
    }

    setVolume(volume: number): void {
        this.audio.volume = volume;
    }

    setPlaybackSpeed(speed: number): void {
        this.audio.playbackRate = speed;
    }

    get state() { return this._state; }
    get currentTime() { return this.audio.currentTime; }
    get duration() { return this.audio.duration || 0; }

    // Internal access for visualizer compatibility in Phase 1
    get audioElement() { return this.audio; }
}
