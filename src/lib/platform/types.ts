export type PlatformCapability =
    | 'mediaSession'
    | 'cast'
    | 'airplay'
    | 'notifications'
    | 'backgroundPlayback'
    | 'deepLinks'
    | 'wearable'
    | 'keyboardShortcuts'
    | 'miniPlayer';

export interface PlatformCapabilities {
    mediaSession: boolean;
    cast: boolean;
    airplay: boolean;
    notifications: boolean;
    backgroundPlayback: boolean;
    deepLinks: boolean;
    wearable: boolean;
    keyboardShortcuts: boolean;
    miniPlayer: boolean;
}

export type Command =
    | 'play'
    | 'pause'
    | 'togglePlay'
    | 'next'
    | 'previous'
    | 'seek'
    | 'volume'
    | 'favorite'
    | 'download'
    | 'playbackRate';

export interface CommandPayload {
    value?: any;
    itemId?: string;
    isRelative?: boolean;
}

export interface PlatformAdapter {
    id: string;
    initialize(): Promise<void>;
    destroy(): void;
    getCapabilities(): Partial<PlatformCapabilities>;
}

export interface PlaybackDevice {
    id: string;
    name: string;
    type: 'chromecast' | 'airplay' | 'speaker' | 'desktop';
    capabilities: Partial<PlatformCapabilities>;
    state: 'available' | 'connecting' | 'connected';
    provider?: RemotePlaybackProvider;
}

export interface RemotePlaybackProvider {
    id: string;
    connect(device: PlaybackDevice): Promise<void>;
    disconnect(): Promise<void>;
    load(item: any): Promise<void>;
    play(): Promise<void>;
    pause(): Promise<void>;
    seek(time: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    setPlaybackSpeed?(speed: number): Promise<void>;
    onEvent(callback: (event: string, data: any) => void): void;
}

export interface PlaybackSession {
    id: string;
    ownerId: string;
    deviceId: string;
    deviceName: string;
    startedAt: string;
    lastActiveAt: string;
    status: 'active' | 'paused' | 'transferred';
    mediaId?: string;
    position?: number;
}
