import { useState, useEffect } from 'react';
import axios from 'axios';
import { extractImageUrl } from '../utils/imageUtils';

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
                const response = await axios.get(apiUrl, { signal: controller.signal });
                const data = response.data?.data;
                if (!data) {
                    throw new Error('No data received from server');
                }
                if (!isAborted) {
                    setDetails(data);
                    setImage(getImageUrl(data));
                }
            } catch (err: unknown) {
                if (axios.isCancel(err)) {
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
