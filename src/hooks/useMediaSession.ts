import { useEffect } from 'react';
import { Song } from '../types/music';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface UseMediaSessionProps {
    currentSong: Song | null;
    isPlaying: boolean;
    imageUrl: string;
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (time: number) => void;
}

export const useMediaSession = ({
    currentSong,
    isPlaying,
    imageUrl,
    onPlay,
    onPause,
    onNext,
    onPrev,
    onSeek
}: UseMediaSessionProps) => {
    useEffect(() => {
        if (!currentSong || !('mediaSession' in navigator)) return;

        const artwork = imageUrl
            ? [{ src: imageUrl, sizes: '512x512', type: 'image/png' }]
            : [];

        navigator.mediaSession.metadata = new window.MediaMetadata({
            title: decodeHtmlEntities(currentSong.name),
            artist: decodeHtmlEntities(currentSong.primaryArtists),
            album: decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name),
            artwork: artwork
        });

        navigator.mediaSession.setActionHandler('play', onPlay);
        navigator.mediaSession.setActionHandler('pause', onPause);
        navigator.mediaSession.setActionHandler('nexttrack', onNext);
        navigator.mediaSession.setActionHandler('previoustrack', onPrev);
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) onSeek(details.seekTime);
        });

        return () => {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('seekto', null);
        };
    }, [currentSong, imageUrl, onPlay, onPause, onNext, onPrev, onSeek]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);
};
