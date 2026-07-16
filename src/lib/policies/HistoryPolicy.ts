import { MediaItem } from '../audio-sdk/models';

export interface HistoryPolicy {
    shouldStoreHistory: boolean;
    shouldTrackDuration: boolean;
    shouldResume: boolean;
}

const DefaultHistoryPolicy: HistoryPolicy = {
    shouldStoreHistory: true,
    shouldTrackDuration: true,
    shouldResume: false,
};

const RadioHistoryPolicy: HistoryPolicy = {
    shouldStoreHistory: true,
    shouldTrackDuration: true,
    shouldResume: false,
};

const PodcastHistoryPolicy: HistoryPolicy = {
    shouldStoreHistory: true,
    shouldTrackDuration: true,
    shouldResume: true,
};

export function getHistoryPolicy(item: MediaItem | null): HistoryPolicy {
    if (!item) return DefaultHistoryPolicy;

    if (item.type === 'radio') {
        return RadioHistoryPolicy;
    }

    if (item.type === 'podcast_episode') {
        return PodcastHistoryPolicy;
    }

    return DefaultHistoryPolicy;
}
