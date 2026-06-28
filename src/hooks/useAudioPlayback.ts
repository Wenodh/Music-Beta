import { useState, useRef, useEffect, useCallback } from 'react';
import { Song } from '../types/music';
import { getNextSong } from '../utils/playlist';
import { playbackManager } from '../lib/playback/PlaybackManager';
import { eventBus, Events } from '../lib/events';
import { songToMediaItem } from '../lib/adapters/mediaItemAdapter';
import { audioSDK } from '../lib/audio-sdk';
import { continuityService } from '../lib/continuity';
import { getPlaybackPolicy } from '../lib/playback/PlaybackPolicy';

interface UseAudioPlaybackProps {
    currentSong: Song | null;
    songs: Song[];
    isPlaying: boolean;
    repeatMode: 'none' | 'one' | 'all';
    shuffle: boolean;
    isGaplessEnabled: boolean;
    crossfadeDuration: number;
    preferredQuality: string;
    userVolume: number;
    isSongRadioEnabled: boolean;
    recommendations: Song[];
    onSongChange: (song: Song, isManual?: boolean) => void;
    onTimeUpdate: (currentTime: number, duration: number) => void;
}

export const useAudioPlayback = ({
    currentSong,
    songs,
    isPlaying,
    repeatMode,
    shuffle,
    isGaplessEnabled,
    crossfadeDuration,
    preferredQuality,
    userVolume,
    isSongRadioEnabled,
    recommendations,
    onSongChange,
    onTimeUpdate
}: UseAudioPlaybackProps) => {
    const [isBuffering, setIsBuffering] = useState(false);

    const activeAudioRef = useRef<HTMLAudioElement | null>(playbackManager._activeAudioElement);
    const inactiveAudioRef = useRef<HTMLAudioElement | null>(playbackManager._inactiveAudioElement);

    useEffect(() => {
        const updateRefs = () => {
            activeAudioRef.current = playbackManager._activeAudioElement;
            inactiveAudioRef.current = playbackManager._inactiveAudioElement;
        };

        eventBus.on(Events.TRACK_CHANGED, updateRefs);
        return () => { eventBus.off(Events.TRACK_CHANGED, updateRefs); };
    }, []);

    useEffect(() => {
        playbackManager.setVolume(userVolume);
    }, [userVolume]);

    // Handle Playback Actions
    useEffect(() => {
        let isCancelled = false;

        const handleSong = async () => {
            if (!currentSong) {
                playbackManager.stop();
                return;
            }

            const mediaItem = songToMediaItem(currentSong);
            const source = await audioSDK.getPlayableSource(mediaItem, preferredQuality);

            if (isCancelled) return;

            if (source?.url) {
                mediaItem.stream = source;
                const policy = getPlaybackPolicy(mediaItem);
                const isNewTrack = playbackManager.currentMediaItem?.id !== mediaItem.id;

                if (isPlaying) {
                    await playbackManager.play(mediaItem);

                    if (isNewTrack && policy.canResume) {
                        const saved = continuityService.getPosition(mediaItem.id);
                        if (saved && saved.position > 10 && saved.position < (saved.duration - 15)) {
                            playbackManager.seek(saved.position);
                        }
                    }
                } else if (playbackManager.currentMediaItem?.id === mediaItem.id) {
                    playbackManager.pause();
                } else if (!isPlaying) {
                    await playbackManager.play(mediaItem);

                    if (isNewTrack && policy.canResume) {
                        const saved = continuityService.getPosition(mediaItem.id);
                        if (saved && saved.position > 10 && saved.position < (saved.duration - 15)) {
                            playbackManager.seek(saved.position);
                        }
                    }
                    playbackManager.pause();
                }
            }
        };

        handleSong();
        return () => { isCancelled = true; };
    }, [currentSong?.id, isPlaying, preferredQuality]);

    // Handle Events
    useEffect(() => {
        const onProgress = ({ currentTime, duration, item }: { currentTime: number, duration: number, item: any }) => {
            if (item?.id === currentSong?.id) {
                onTimeUpdate(currentTime, duration);
            }

            // Gapless/Crossfade logic
            if (isGaplessEnabled && duration > 0 && currentTime > (duration - crossfadeDuration)) {
                if (repeatMode !== 'one' && item?.id === currentSong?.id) {
                    const next = getNextSong(currentSong!, songs, shuffle, repeatMode, false);
                    if (next) {
                        const nextMediaItem = songToMediaItem(next);
                        audioSDK.getPlayableSource(nextMediaItem, preferredQuality).then(source => {
                            if (source) {
                                nextMediaItem.stream = source;
                                playbackManager.startCrossfade(nextMediaItem, crossfadeDuration).then(() => {
                                    onSongChange(next, false);
                                });
                            }
                        });
                    }
                }
            }
        };

        const onEnded = () => {
            if (repeatMode === 'one') {
                playbackManager.seek(0);
                playbackManager.play(playbackManager.currentMediaItem!);
            } else {
                const next = getNextSong(currentSong!, songs, shuffle, repeatMode, false);
                if (next) {
                    onSongChange(next, false);
                } else if (isSongRadioEnabled && recommendations.length > 0) {
                    const randomSong = recommendations[Math.floor(Math.random() * Math.min(5, recommendations.length))];
                    onSongChange(randomSong, false);
                }
            }
        };

        const onBuffering = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);

        eventBus.on(Events.PLAYBACK_PROGRESS, onProgress);
        eventBus.on(Events.PLAYBACK_ENDED, onEnded);
        eventBus.on(Events.BUFFERING, onBuffering);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaying);

        return () => {
            eventBus.off(Events.PLAYBACK_PROGRESS, onProgress);
            eventBus.off(Events.PLAYBACK_ENDED, onEnded);
            eventBus.off(Events.BUFFERING, onBuffering);
            eventBus.off(Events.PLAYBACK_STARTED, onPlaying);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSong?.id, songs, repeatMode, shuffle, isSongRadioEnabled, recommendations, onSongChange, onTimeUpdate, isGaplessEnabled, crossfadeDuration, preferredQuality]);

    const seek = useCallback((time: number) => {
        playbackManager.seek(time);
    }, []);

    return { activeAudioRef, inactiveAudioRef, isBuffering, seek };
};
