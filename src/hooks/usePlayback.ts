import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
    playMusic,
    pauseMusic,
    nextSong,
    prevSong as prevSongAction,
} from '../features/musicplayer/musicPlayerSlice';
import { useSession } from './useSession';
import { Song } from '../types/music';

export const usePlayback = () => {
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

    const playNext = useCallback((isManual = true) => {
        dispatch(nextSong({ isManual }));
    }, [dispatch]);

    const playPrev = useCallback(() => {
        dispatch(prevSongAction());
    }, [dispatch]);

    const playSpecific = useCallback((song: Song) => {
        dispatch(playMusic({ ...song, forcePlay: true }));
        if (isHost && isJoined) broadcast('play', { song });
    }, [dispatch, isHost, isJoined, broadcast]);

    return {
        isPlaying,
        currentSong,
        togglePlayPause,
        playNext,
        playPrev,
        playSpecific
    };
};
