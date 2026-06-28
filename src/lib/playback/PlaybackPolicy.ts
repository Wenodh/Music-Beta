import { MediaItem } from '../audio-sdk/models';
import { providerRegistry } from '../audio-sdk/registry';

export interface PlaybackPolicy {
    canSeek: boolean;
    canResume: boolean;
    showLiveIndicator: boolean;
    showDuration: boolean;
    canChangeSpeed: boolean;
    canSkipNext: boolean;
    canSkipPrevious: boolean;
}

const DefaultPolicy: PlaybackPolicy = {
    canSeek: true,
    canResume: true,
    showLiveIndicator: false,
    showDuration: true,
    canChangeSpeed: true,
    canSkipNext: true,
    canSkipPrevious: true,
};

const RadioPolicy: PlaybackPolicy = {
    canSeek: false,
    canResume: false,
    showLiveIndicator: true,
    showDuration: false,
    canChangeSpeed: false,
    canSkipNext: false,
    canSkipPrevious: false,
};

export function getPlaybackPolicy(item: MediaItem | null): PlaybackPolicy {
    if (!item) return DefaultPolicy;

    const provider = providerRegistry.getProvider(item.provider);
    if (provider?.capabilities.live || item.type === 'radio') {
        return RadioPolicy;
    }

    return DefaultPolicy;
}
