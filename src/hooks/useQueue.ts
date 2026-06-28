import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    setQueueOpen
} from '../features/musicplayer/musicPlayerSlice';
import { Song } from '../types/music';

export const useQueue = () => {
    const dispatch = useAppDispatch();
    const { songs: queue, isQueueOpen } = useAppSelector((state) => state.musicPlayer);

    const addTrack = useCallback((song: Song) => {
        dispatch(addToQueue(song));
    }, [dispatch]);

    const removeTrack = useCallback((id: string) => {
        dispatch(removeFromQueue(id));
    }, [dispatch]);

    const updateOrder = useCallback((newQueue: Song[]) => {
        dispatch(reorderQueue(newQueue));
    }, [dispatch]);

    const clearAll = useCallback(() => {
        dispatch(clearQueue());
    }, [dispatch]);

    const toggleQueue = useCallback((isOpen?: boolean) => {
        dispatch(setQueueOpen(isOpen ?? !isQueueOpen));
    }, [dispatch, isQueueOpen]);

    return {
        queue,
        isQueueOpen,
        addTrack,
        removeTrack,
        updateOrder,
        clearAll,
        toggleQueue
    };
};
