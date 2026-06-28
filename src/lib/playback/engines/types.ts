import { PlaybackState } from '../../audio-sdk/models';

export interface PlaybackEngineEvents {
    onStateChange: (state: PlaybackState) => void;
    onProgress: (currentTime: number, duration: number) => void;
    onEnded: () => void;
    onError: (error: Error) => void;
}

export interface PlaybackEngine {
    readonly id: string;

    load(url: string, metadata?: any): Promise<void>;
    play(): Promise<void>;
    pause(): void;
    stop(): void;
    seek(time: number): void;
    setVolume(volume: number): void;

    readonly state: PlaybackState;
    readonly currentTime: number;
    readonly duration: number;

    readonly audioElement: HTMLAudioElement;
}
