import { useCallback } from 'react';
import { audioSDK } from '../../../lib/audio-sdk';
import { useExplorePagination } from './useExplorePagination';
import { MediaItem } from '../../../lib/audio-sdk/models';

export function usePodcastExplore(language: string) {
    const fetchPodcasts = useCallback(async (page: number, signal: AbortSignal) => {
        return audioSDK.searchPodcasts(language, { page, limit: 30, signal, type: 'podcast' });
    }, [language]);

    return useExplorePagination<MediaItem>({
        fetchFn: fetchPodcasts,
        pageSize: 30
    });
}
