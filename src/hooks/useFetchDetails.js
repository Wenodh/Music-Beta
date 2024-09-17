import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setSongs } from '../features/musicplayer/musicPlayerSlice';

const useFetchDetails = (apiUrl, getImageUrl) => {
    const dispatch = useDispatch();
    const [details, setDetails] = useState(null);
    const [image, setImage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDetails = useCallback(async () => {
        try {
            const res = await axios.get(apiUrl);
            const { data } = res.data;
            setDetails(data);
            dispatch(setSongs(data?.songs || data?.topSongs));
            setImage(getImageUrl(data.image));
        } catch (err) {
            setError('Failed to fetch details.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, getImageUrl, dispatch]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    return { details, image, loading, error };
};

export default useFetchDetails;
