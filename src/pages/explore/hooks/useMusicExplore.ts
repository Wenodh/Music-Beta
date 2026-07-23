import { useCallback } from 'react';
import { audioSDK } from '../../../lib/audio-sdk';
import { useExplorePagination } from './useExplorePagination';
import { MediaItem } from '../../../lib/audio-sdk/models';

export function useMusicExplore(language: string) {
    const fetchMusic = useCallback(async (page: number, signal: AbortSignal) => {
        // JioSaavn API uses 1-based page indexing, so map 0-based page index to 1-based index
        return audioSDK.search(language, { page: page + 1, limit: 30, signal, type: 'song' });
    }, [language]);

    return useExplorePagination<MediaItem>({
        fetchFn: fetchMusic,
        pageSize: 30
    });
}
