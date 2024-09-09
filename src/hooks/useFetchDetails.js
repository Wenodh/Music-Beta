import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { setSongs } from '../features/musicPlayer/musicPlayerSlice';
import { useDispatch } from 'react-redux';

const useFetchDetails = (apiUrl, id, getImageUrl) => {
    const dispatch = useDispatch();
    const [details, setDetails] = useState(null);
    const [image, setImage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDetails = useCallback(async () => {
        try {
            const res = await axios.get(`${apiUrl}${id}`);
            const { data } = res.data;
            setDetails(data);
            dispatch(setSongs(data.songs));
            setImage(getImageUrl(data.image));
        } catch (err) {
            setError('Failed to fetch details.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, id, getImageUrl]);

    useEffect(() => {
        fetchDetails();
    }, []);

    return { details, image, loading, error };
};

export default useFetchDetails;
