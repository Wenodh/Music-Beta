import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
    playMusic,
    pauseMusic,
    nextSong,
    prevSong as prevSongAction,
    toggleShuffle,
    toggleRepeatMode,
    setSongRadioEnabled,
    setVisualizerStyle,
    setQueueOpen
} from '../features/musicplayer/musicPlayerSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen, setPlayerExpanded, setSessionModalOpen, setLyricsOpen } from '../features/ui/uiSlice';
import { useSession } from './useSession';
import { Song } from '../types/music';

export const usePlayerActions = () => {
    const dispatch = useAppDispatch();
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);
    const { isJoined, isHost } = useAppSelector((state) => state.session);
    const { broadcast } = useSession();

    const togglePlayPause = useCallback(() => {
        if (!currentSong) return;
        if (isPlaying) {
            dispatch(pauseMusic());
            if (isHost && isJoined) broadcast('pause', {});
        } else {
            dispatch(playMusic(currentSong));
            if (isHost && isJoined) broadcast('play', { song: currentSong });
        }
    }, [dispatch, currentSong, isPlaying, isHost, isJoined, broadcast]);

    const handleNext = useCallback((isManual = true) => {
        dispatch(nextSong({ isManual }));
    }, [dispatch]);

    const handlePrev = useCallback(() => {
        dispatch(prevSongAction());
    }, [dispatch]);

    const handleToggleFavorite = useCallback(() => {
        if (currentSong) {
            dispatch(toggleFavoriteCloud(currentSong) as any);
        }
    }, [dispatch, currentSong]);

    const handleToggleShuffle = useCallback(() => {
        dispatch(toggleShuffle());
    }, [dispatch]);

    const handleToggleRepeat = useCallback(() => {
        dispatch(toggleRepeatMode());
    }, [dispatch]);

    const handleToggleQueue = useCallback((isOpen: boolean) => {
        dispatch(setQueueOpen(isOpen));
    }, [dispatch]);

    const handleOpenPlaylistModal = useCallback(() => {
        if (currentSong) dispatch(openPlaylistModal(currentSong));
    }, [dispatch, currentSong]);

    const handleToggleRadio = useCallback((enabled: boolean) => {
        dispatch(setSongRadioEnabled(enabled));
    }, [dispatch]);

    const handleSetVisualizerStyle = useCallback((style: 'bars' | 'waveform' | 'particles' | 'circular' | 'pixel') => {
        dispatch(setVisualizerStyle(style));
    }, [dispatch]);

    const handleTogglePlayerExpanded = useCallback((expanded: boolean) => {
        dispatch(setPlayerExpanded(expanded));
    }, [dispatch]);

    const handleToggleSessionModal = useCallback((open: boolean) => {
        dispatch(setSessionModalOpen(open));
    }, [dispatch]);

    const handleToggleLyrics = useCallback((open: boolean) => {
        dispatch(setLyricsOpen(open));
    }, [dispatch]);

    const handleShare = useCallback(async (song: Song | null) => {
        if (!song) return;
        const songUrl = window.location.origin + `/albums/${song.albumId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: song.name,
                    text: `Check out ${song.name} on Vibe On!`,
                    url: songUrl
                });
            } catch (error) {
                console.log('Error sharing', error);
            }
        } else {
            navigator.clipboard.writeText(songUrl);
            // We might want a toast here instead of alert
            alert('Link copied to clipboard!');
        }
    }, []);

    return {
        togglePlayPause,
        handleNext,
        handlePrev,
        handleToggleFavorite,
        handleToggleShuffle,
        handleToggleRepeat,
        handleToggleQueue,
        handleOpenPlaylistModal,
        handleToggleRadio,
        handleSetVisualizerStyle,
        handleTogglePlayerExpanded,
        handleToggleSessionModal,
        handleToggleLyrics,
        handleShare
    };
};
