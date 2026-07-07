import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { collaborationService } from '../services/CollaborationService';
import { updateCollaborativePlaylist } from '../socialSlice';
import { PlaylistOperation } from '../types';

export const useCollaborativePlaylist = (playlistId: string) => {
    const dispatch = useDispatch();
    const playlist = useSelector((state: RootState) => state.social.activeCollaborativePlaylists[playlistId]);
    const [operations, setOperations] = useState<PlaylistOperation[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPlaylist = useCallback(async () => {
        setLoading(true);
        try {
            const data = await collaborationService.getPlaylist(playlistId);
            dispatch(updateCollaborativePlaylist(data));
            setOperations(data.operations);
        } catch (error) {
            logger.error('Failed to fetch collaborative playlist', error);
        } finally {
            setLoading(false);
        }
    }, [playlistId, dispatch]);

    useEffect(() => {
        fetchPlaylist();

        collaborationService.subscribeToPlaylist(playlistId, (newOp) => {
            setOperations(prev => {
                const next = [...prev, newOp].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                return next;
            });
        });

        return () => {
            collaborationService.unsubscribeFromPlaylist(playlistId);
        };
    }, [playlistId, fetchPlaylist]);

    const applyOp = async (type: PlaylistOperation['opType'], payload: any) => {
        await collaborationService.applyOperation(playlistId, type, payload);
    };

    return { playlist, operations, loading, applyOp, refresh: fetchPlaylist };
};
