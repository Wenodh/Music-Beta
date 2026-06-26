import { useState, useRef, useEffect, useCallback } from 'react';
import { Song } from '../types/music';
import { getOfflineSong } from '../utils/db';
import { getNextSong } from '../utils/playlist';

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
    const audioRefA = useRef<HTMLAudioElement>(new Audio(''));
    const audioRefB = useRef<HTMLAudioElement>(new Audio(''));
    const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');
    const [isCrossfading, setIsCrossfading] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);

    const getActiveAudio = useCallback(() => activeBuffer === 'A' ? audioRefA.current : audioRefB.current, [activeBuffer]);
    const getInactiveAudio = useCallback(() => activeBuffer === 'A' ? audioRefB.current : audioRefA.current, [activeBuffer]);

    const audioUrlsRef = useRef<Record<string, string>>({});

    const cleanupBlobUrls = useCallback(() => {
        Object.values(audioUrlsRef.current).forEach(url => {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        audioUrlsRef.current = {};
    }, []);

    useEffect(() => {
        [audioRefA.current, audioRefB.current].forEach(audio => {
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
            audio.onwaiting = () => setIsBuffering(true);
            audio.onplaying = () => setIsBuffering(false);
            audio.oncanplay = () => setIsBuffering(false);
        });
        return cleanupBlobUrls;
    }, [cleanupBlobUrls]);

    const getSongUrl = useCallback(async (song: Song | null) => {
        if (!song) return '';

        // Revoke previous blob for this song if exists to avoid leaks
        if (audioUrlsRef.current[song.id]?.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrlsRef.current[song.id]);
        }

        const offlineSong = await getOfflineSong(song.id);
        let url = '';
        if (offlineSong?.audioBlob) {
            url = URL.createObjectURL(offlineSong.audioBlob);
            audioUrlsRef.current[song.id] = url;
        } else {
            const musicData = song.music || song.downloadUrl;
            if (Array.isArray(musicData)) {
                url = musicData.find((d: any) => d.quality === preferredQuality)?.url || musicData[musicData.length - 1]?.url;
            } else {
                url = musicData || '';
            }
        }
        return url;
    }, [preferredQuality]);

    useEffect(() => {
        const activeAudio = getActiveAudio();
        if (!currentSong) return;

        getSongUrl(currentSong).then(url => {
            if (url && activeAudio.src !== url) {
                activeAudio.src = url;
                setIsCrossfading(false);
            }
            if (isPlaying) {
                activeAudio.play().catch(e => console.warn("Playback failed", e));
            } else {
                activeAudio.pause();
                getInactiveAudio().pause();
            }
        });
    }, [currentSong?.id, isPlaying, getActiveAudio, getInactiveAudio, getSongUrl]);

    useEffect(() => {
        const activeAudio = getActiveAudio();
        const inactiveAudio = getInactiveAudio();

        const handleTimeUpdate = () => {
            if (!currentSong) return;
            onTimeUpdate(activeAudio.currentTime, activeAudio.duration);

            if (isGaplessEnabled && !isCrossfading && activeAudio.duration > 0 &&
                activeAudio.currentTime > (activeAudio.duration - crossfadeDuration)) {
                if (repeatMode !== 'one') {
                    const next = getNextSong(currentSong, songs, shuffle, repeatMode, false);
                    if (next) {
                        setIsCrossfading(true);
                        startCrossfade(next);
                    }
                }
            }
        };

        const startCrossfade = (next: Song) => {
            getSongUrl(next).then(url => {
                inactiveAudio.src = url;
                inactiveAudio.volume = 0;
                inactiveAudio.play().then(() => {
                    const steps = 20;
                    const interval = (crossfadeDuration * 1000) / steps;
                    let step = 0;
                    const fade = setInterval(() => {
                        step++;
                        const progress = step / steps;
                        activeAudio.volume = userVolume * (1 - progress);
                        inactiveAudio.volume = userVolume * progress;
                        if (step >= steps) {
                            clearInterval(fade);
                            activeAudio.pause();
                            activeAudio.currentTime = 0;
                            setActiveBuffer(prev => prev === 'A' ? 'B' : 'A');
                            setIsCrossfading(false);
                            onSongChange(next, false);
                        }
                    }, interval);
                });
            });
        };

        const handleEnded = () => {
            if (!isCrossfading) {
                if (repeatMode === 'one') {
                    activeAudio.currentTime = 0;
                    activeAudio.play();
                } else {
                    const next = getNextSong(currentSong!, songs, shuffle, repeatMode, false);
                    if (next) {
                        onSongChange(next, false);
                    } else if (isSongRadioEnabled && recommendations.length > 0) {
                        const randomSong = recommendations[Math.floor(Math.random() * Math.min(5, recommendations.length))];
                        onSongChange(randomSong, false);
                    }
                }
            }
        };

        activeAudio.addEventListener('timeupdate', handleTimeUpdate);
        activeAudio.addEventListener('ended', handleEnded);
        return () => {
            activeAudio.removeEventListener('timeupdate', handleTimeUpdate);
            activeAudio.removeEventListener('ended', handleEnded);
        };
    }, [activeBuffer, currentSong, isGaplessEnabled, isCrossfading, crossfadeDuration, songs, userVolume, repeatMode, shuffle, isSongRadioEnabled, recommendations, onSongChange, onTimeUpdate, getSongUrl, getActiveAudio, getInactiveAudio]);

    useEffect(() => {
        if (!isCrossfading) {
            audioRefA.current.volume = userVolume;
            audioRefB.current.volume = userVolume;
        }
    }, [userVolume, isCrossfading]);

    const seek = useCallback((time: number) => {
        getActiveAudio().currentTime = time;
    }, [getActiveAudio]);

    return { activeAudioRef: activeBuffer === 'A' ? audioRefA : audioRefB, inactiveAudioRef: activeBuffer === 'A' ? audioRefB : audioRefA, isBuffering, seek };
};
