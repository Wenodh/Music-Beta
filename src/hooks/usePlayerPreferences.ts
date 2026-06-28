import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
    setVisualizerStyle,
    toggleRepeatMode,
    toggleShuffle,
    setSongRadioEnabled,
} from '../features/musicplayer/musicPlayerSlice';

export const usePlayerPreferences = () => {
    const dispatch = useAppDispatch();
    const {
        visualizerStyle,
        repeatMode,
        shuffle,
        isSongRadioEnabled
    } = useAppSelector((state) => state.musicPlayer);

    const changeVisualizerStyle = useCallback((style: 'bars' | 'waveform' | 'particles' | 'circular' | 'pixel') => {
        dispatch(setVisualizerStyle(style));
    }, [dispatch]);

    const handleToggleShuffle = useCallback(() => {
        dispatch(toggleShuffle());
    }, [dispatch]);

    const handleToggleRepeat = useCallback(() => {
        dispatch(toggleRepeatMode());
    }, [dispatch]);

    const handleToggleRadio = useCallback((enabled?: boolean) => {
        dispatch(setSongRadioEnabled(enabled ?? !isSongRadioEnabled));
    }, [dispatch, isSongRadioEnabled]);

    return {
        visualizerStyle,
        repeatMode,
        shuffle,
        isSongRadioEnabled,
        changeVisualizerStyle,
        handleToggleShuffle,
        handleToggleRepeat,
        handleToggleRadio
    };
};
