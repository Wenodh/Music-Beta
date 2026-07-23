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
    skipForwardInterval: number; // in seconds
    skipBackwardInterval: number; // in seconds
}

const DefaultPolicy: PlaybackPolicy = {
    canSeek: true,
    canResume: true,
    showLiveIndicator: false,
    showDuration: true,
    canChangeSpeed: false, // Default to false for Music/Radio unless specified
    canSkipNext: true,
    canSkipPrevious: true,
    skipForwardInterval: 0,
    skipBackwardInterval: 0,
};

const RadioPolicy: PlaybackPolicy = {
    canSeek: false,
    canResume: false,
    showLiveIndicator: true,
    showDuration: false,
    canChangeSpeed: false,
    canSkipNext: false,
    canSkipPrevious: false,
    skipForwardInterval: 0,
    skipBackwardInterval: 0,
};

const PodcastPolicy: PlaybackPolicy = {
    canSeek: true,
    canResume: true,
    showLiveIndicator: false,
    showDuration: true,
    canChangeSpeed: true,
    canSkipNext: true,
    canSkipPrevious: true,
    skipForwardInterval: 30,
    skipBackwardInterval: 10,
};

const AudiobookPolicy: PlaybackPolicy = {
    canSeek: true,
    canResume: true,
    showLiveIndicator: false,
    showDuration: true,
    canChangeSpeed: true,
    canSkipNext: true,
    canSkipPrevious: true,
    skipForwardInterval: 30,
    skipBackwardInterval: 15,
};

export function getPlaybackPolicy(item: MediaItem | null): PlaybackPolicy {
    if (!item) return DefaultPolicy;

    const provider = providerRegistry.getProvider(item.provider);

    if (provider?.capabilities.live || item.type === 'radio') {
        return RadioPolicy;
    }

    if (item.type === 'episode' || item.type === 'podcast') {
        return PodcastPolicy;
    }

    if (item.type === 'audiobook' || item.type === 'chapter') {
        return AudiobookPolicy;
    }

    // Explicit check for provider capabilities if available
    if (provider?.capabilities.speedControl) {
        return { ...DefaultPolicy, canChangeSpeed: true };
    }

    return DefaultPolicy;
}
