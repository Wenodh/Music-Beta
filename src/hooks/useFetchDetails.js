// src/hooks/useFetchDetails.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useFetchDetails = (apiUrl, id, getImageUrl) => {
  const [details, setDetails] = useState(null);
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}${id}`);
      const { data } = res.data;
      setDetails(data);
      setImage(getImageUrl(data.image));
    } catch (err) {
      setError("Failed to fetch details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, id, getImageUrl]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { details, image, loading, error };
};

export default useFetchDetails;
