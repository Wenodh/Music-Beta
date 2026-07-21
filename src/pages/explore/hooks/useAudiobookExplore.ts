import { useCallback } from 'react';
import { audioSDK } from '../../../lib/audio-sdk';
import { useExplorePagination } from './useExplorePagination';
import { MediaItem } from '../../../lib/audio-sdk/models';

export function useAudiobookExplore(language: string) {
    const fetchAudiobooks = useCallback(async (page: number, signal: AbortSignal) => {
        if (!language || language.trim() === '') {
            // General Explore landing page browse: show Popular Audiobooks
            return audioSDK.getPopularAudiobooks(30);
        }
        return audioSDK.searchAudiobooks(language, { page, limit: 30, signal, type: 'audiobook' });
    }, [language]);

    return useExplorePagination<MediaItem>({
        fetchFn: fetchAudiobooks,
        pageSize: 30
    });
}
