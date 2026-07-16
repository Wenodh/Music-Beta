import { useCallback } from 'react';
import { audioSDK } from '../../../lib/audio-sdk';
import { useExplorePagination } from './useExplorePagination';
import { MediaItem } from '../../../lib/audio-sdk/models';

export function useMusicExplore(language: string) {
    const fetchMusic = useCallback(async (page: number, signal: AbortSignal) => {
        return audioSDK.search(language, { page, limit: 30, signal });
    }, [language]);

    return useExplorePagination<MediaItem>({
        fetchFn: fetchMusic,
        pageSize: 30
    });
}
