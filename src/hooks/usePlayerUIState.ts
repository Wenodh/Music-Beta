import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { setSessionModalOpen, setPlayerExpanded, setLyricsOpen } from '../features/ui/uiSlice';

export const usePlayerUIState = () => {
    const dispatch = useAppDispatch();
    const {
        isPlayerExpanded,
        isSessionModalOpen,
        isLyricsOpen,
        theme
    } = useAppSelector((state) => state.ui);

    const togglePlayerExpanded = useCallback((expanded: boolean) => {
        dispatch(setPlayerExpanded(expanded));
    }, [dispatch]);

    const toggleSessionModal = useCallback((open: boolean) => {
        dispatch(setSessionModalOpen(open));
    }, [dispatch]);

    const toggleLyrics = useCallback((open: boolean) => {
        dispatch(setLyricsOpen(open));
    }, [dispatch]);

    return {
        isPlayerExpanded,
        isSessionModalOpen,
        isLyricsOpen,
        accentColor: theme?.accentColor || '#ef4444',
        accentRgb: theme?.accentRgb || '239, 68, 68',
        isOled: theme?.isOled || false,
        togglePlayerExpanded,
        toggleSessionModal,
        toggleLyrics
    };
};
