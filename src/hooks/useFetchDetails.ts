import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface FetchDetailsResult<T> {
    details: T | null;
    loading: boolean;
    error: string | null;
    image: string;
}

/**
 * In-memory cache for API responses to avoid redundant network requests.
 * Stores data with a timestamp for expiration.
 */
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

/**
 * Custom hook to fetch details for albums, artists, or playlists.
 * Includes built-in caching and automatic image URL extraction.
 *
 * @template T - The type of data expected from the API.
 * @param {string} apiUrl - The full URL to fetch data from.
 * @param {(data: T) => string} getImageUrl - Callback function to extract the image URL from the response data.
 * @returns {FetchDetailsResult<T>} An object containing the fetched details, loading state, error state, and extracted image URL.
 */
const useFetchDetails = <T extends { name?: string; title?: string }>(
    apiUrl: string,
    getImageUrl: (data: T) => string
): FetchDetailsResult<T> => {
    const [details, setDetails] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [image, setImage] = useState<string>('');

    const stableGetImageUrl = useCallback(getImageUrl, []);

    useEffect(() => {
        const fetchDetails = async () => {
            // Check cache
            const cachedItem = cache[apiUrl];
            if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
                setDetails(cachedItem.data);
                setImage(stableGetImageUrl(cachedItem.data));
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await axios.get(apiUrl);
                const data = response.data.data;

                // Update cache
                cache[apiUrl] = { data, timestamp: Date.now() };

                setDetails(data);
                setImage(stableGetImageUrl(data));
            } catch (err) {
                console.error(err);
                setError('Failed to fetch details.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [apiUrl, stableGetImageUrl]);

    return { details, loading, error, image };
};

export default useFetchDetails;
