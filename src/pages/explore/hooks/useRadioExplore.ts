import { useCallback } from 'react';
import { audioSDK } from '../../../lib/audio-sdk';
import { providerRegistry } from '../../../lib/audio-sdk/registry';
import { RadioBrowserProvider } from '../../../lib/audio-sdk/providers/radio-browser';
import { useExplorePagination } from './useExplorePagination';
import { MediaItem } from '../../../lib/audio-sdk/models';

export function useRadioExplore(language: string, selectedMetadata: string | null, activeMetadataType: 'countries' | 'languages' | 'tags' | null) {
    const fetchRadio = useCallback(async (page: number, signal: AbortSignal) => {
        const radioProvider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
        if (!radioProvider) return [];

        if (selectedMetadata && activeMetadataType) {
            return radioProvider.getStationsByMetadata(activeMetadataType, selectedMetadata, {
                page,
                limit: 30,
                signal
            });
        } else {
            return audioSDK.search(language, { page, limit: 30, type: 'radio', signal });
        }
    }, [language, selectedMetadata, activeMetadataType]);

    return useExplorePagination<MediaItem>({
        fetchFn: fetchRadio,
        pageSize: 30
    });
}
