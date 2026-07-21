import Hls from 'hls.js';
import { PlaybackEngine, PlaybackEngineEvents } from './types';
import { PlaybackState } from '../../audio-sdk/models';

export class HLSAudioEngine implements PlaybackEngine {
    readonly id = 'hls';
    private hls: Hls | null = null;
    private audio: HTMLAudioElement;
    private events: PlaybackEngineEvents;
    private _state: PlaybackState = 'idle';

    constructor(events: PlaybackEngineEvents, audio?: HTMLAudioElement) {
        this.events = events;
        this.audio = audio || new Audio();
        this.audio.crossOrigin = 'anonymous';
        this.setupAudioListeners();
    }

    private setupAudioListeners() {
        this.audio.onplay = () => this.updateState('playing');
        this.audio.onpause = () => this.updateState('paused');
        this.audio.onwaiting = () => this.updateState('buffering');
        this.audio.onplaying = () => this.updateState('playing');
        this.audio.onended = () => {
            this.updateState('ended');
            this.events.onEnded();
        };
        this.audio.onerror = (e) => {
            // Only report if HLS isn't already handling it
            if (!this.hls) {
                this.updateState('error');
                this.events.onError(new Error('Audio element error'));
            }
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
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            this.audio.src = url;
        } else if (Hls.isSupported()) {
            this.hls = new Hls();
            this.hls.loadSource(url);
            this.hls.attachMedia(this.audio);
            this.hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    this.updateState('error');
                    this.events.onError(new Error(`HLS fatal error: ${data.type}`));
                }
            });
        } else {
            throw new Error('HLS is not supported in this browser');
        }
    }

    async play(): Promise<void> {
        return this.audio.play();
    }

    pause(): void {
        this.audio.pause();
    }

    stop(): void {
        this.audio.pause();
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
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

    get audioElement() { return this.audio; }
}
