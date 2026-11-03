import { useState, useEffect } from 'react';
import { extractImageUrl } from '../utils/imageUtils';
import { musicApiService } from '../services/musicApiService';

interface FetchDetailsResult<T> {
    details: T | null;
    loading: boolean;
    error: string | null;
    image: string;
}

const useFetchDetails = <T extends { name?: string; title?: string }>(
    apiUrl: string,
    getImageUrl: (data: T) => string = extractImageUrl as unknown as (data: T) => string
): FetchDetailsResult<T> => {
    const [details, setDetails] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [image, setImage] = useState<string>('');

    useEffect(() => {
        const controller = new AbortController();
        let isAborted = false;

        const fetchDetails = async () => {
            if (!apiUrl) return;
            try {
                setLoading(true);
                setError(null);
                const path = apiUrl.replace(/https?:\/\/[^/]+/, '');
                const response = await musicApiService.fetchWithFallback(path, { signal: controller.signal, timeout: 8000 });
                const data = response.data?.data || response.data;
                if (!data) {
                    throw new Error('No data received from server');
                }
                if (!isAborted) {
                    setDetails(data);
                    setImage(getImageUrl(data));
                }
            } catch (err: any) {
                if (err?.name === 'CanceledError' || controller.signal.aborted) {
                    return;
                }
                if (!isAborted) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch details.';
                    console.error(err);
                    setError(errorMessage);
                }
            } finally {
                if (!isAborted) {
                    setLoading(false);
                }
            }
        };

        fetchDetails();

        return () => {
            isAborted = true;
            controller.abort();
        };
    }, [apiUrl, getImageUrl]);

    return { details, loading, error, image };
};

export default useFetchDetails;
