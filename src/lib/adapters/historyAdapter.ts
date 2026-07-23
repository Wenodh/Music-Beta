import { MediaItem, HistoryItem } from '../audio-sdk/models';

export const mediaItemToHistory = (media: MediaItem, listenedDuration: number = 0): HistoryItem => {
    const duration = media.duration || 0;
    const completionPercentage = duration > 0 ? (listenedDuration / duration) * 100 : undefined;

    return {
        id: media.id,
        media,
        playedAt: new Date().toISOString(),
        listenedDuration,
        completionPercentage
    };
};
