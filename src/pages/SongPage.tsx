import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { showToast } from '../features/ui/uiSlice';
import axios from 'axios';
import { url as baseUrl } from '../constants';

const SongPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;

        const fetchSongAndPlay = async () => {
            try {
                // The API endpoint for a single song by ID is /api/songs?ids=ID
                const res = await axios.get(`${baseUrl}/api/songs?ids=${id}`);
                const songData = res.data.data?.[0];

                if (songData) {
                    dispatch(playMusic(songData));
                    dispatch(showToast({ message: `Playing: ${songData.name}` }));
                } else {
                    dispatch(showToast({ message: 'Song not found', type: 'error' }));
                }
            } catch (error) {
                console.error('Error fetching song:', error);
                dispatch(showToast({ message: 'Failed to load song', type: 'error' }));
            } finally {
                // Redirect to home after attempting to play
                navigate('/', { replace: true });
            }
        };

        fetchSongAndPlay();
    }, [id, dispatch, navigate]);

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Loading song...</p>
        </div>
    );
};

export default SongPage;
