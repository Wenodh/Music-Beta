import { useCallback } from 'react';
import { audioSDK } from '../../../lib/audio-sdk';
import { useExplorePagination } from './useExplorePagination';
import { MediaItem } from '../../../lib/audio-sdk/models';

export function useAudiobookExplore(language: string) {
    const fetchAudiobooks = useCallback(async (page: number, signal: AbortSignal) => {
        return audioSDK.searchAudiobooks(language, { page, limit: 30, signal, type: 'audiobook' });
    }, [language]);

    return useExplorePagination<MediaItem>({
        fetchFn: fetchAudiobooks,
        pageSize: 30
    });
}
