import { BiRepeat } from 'react-icons/bi';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold, PiRepeatOnceBold } from 'react-icons/pi';
import { FaPlay, FaPause } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { IoEllipsisVertical } from 'react-icons/io5';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    playMusic,
    pauseMusic,
    setCurrentTime,
    setSongRadioEnabled,
    setVisualizerStyle,
    toggleRepeatMode,
    toggleShuffle,
    nextSong,
    prevSong as prevSongAction,
    setRecommendations,
    setQueueOpen,
} from '../features/musicplayer/musicPlayerSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { IoPeopleOutline } from 'react-icons/io5';
import { musicApi } from '../services/musicApi';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { getOfflineSong } from '../utils/db';
import Visualizer from './Visualizer';
import MobileNowPlaying from './MobileNowPlaying';
import Lyrics from './Lyrics';
import SessionModal from './modals/SessionModal';
import { useSession } from '../hooks/useSession';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setAccentColor, setPlayerExpanded, setSessionModalOpen, setLyricsOpen } from '../features/ui/uiSlice';
import { Song } from '../types/music';
import { getDominantColor } from '../utils/colorExtractor';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useMediaSession } from '../hooks/useMediaSession';

// Sub-components
import MiniPlayerMetadata from './player/MiniPlayerMetadata';
import PlayerControls from './player/PlayerControls';
import PlayerActions from './player/PlayerActions';

const Player = ({ onShowMiniPlayer }: { onShowMiniPlayer?: () => void }) => {
    const dispatch = useAppDispatch();
    const [isDownloading, setIsDownloading] = useState(false);
    const [seekAnimation, setSeekAnimation] = useState<'forward' | 'backward' | null>(null);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const [userVolume, setUserVolume] = useState(0.7);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const {
        currentSong, isPlaying, songs, preferredQuality, isQueueOpen,
        isGaplessEnabled, crossfadeDuration, recommendations, isSongRadioEnabled,
        visualizerStyle, repeatMode, shuffle, recommendationsCache
    } = useAppSelector((state) => state.musicPlayer);

    const { isLyricsOpen, isPlayerExpanded, isSessionModalOpen, theme: uiTheme } = useAppSelector((state) => state.ui);
    const { favorites } = useAppSelector((state) => state.library);

    const [imageUrl, setImageUrl] = useState<string>('');
    const imageUrlsRef = useRef<Set<string>>(new Set());
    const [progress, setProgress] = useState(0);
    const isFavorite = useMemo(() => favorites.some(s => s.id === currentSong?.id), [favorites, currentSong?.id]);

    const { broadcast, sendReaction, isInternalAction } = useSession();
    const { isJoined, isHost, reactions } = useAppSelector(state => state.session);

    const currentSongRef = useRef(currentSong);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    const handleSongChange = useCallback((song: Song, isManual = true) => {
        if (isManual) {
            dispatch(nextSong({ isManual: true }));
        } else {
            dispatch(playMusic({ ...song, forcePlay: true }));
        }
    }, [dispatch]);

    const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
        dispatch(setCurrentTime(currentTime));
        const progressVal = (currentTime / (duration || 1)) * 100;
        setProgress(progressVal);

        const progressElement = document.getElementById('progress') as HTMLInputElement;
        if (progressElement) {
            progressElement.value = progressVal.toString();
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ef4444';
            const trackColor = uiTheme?.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            progressElement.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${progressVal}%, ${trackColor} ${progressVal}%, ${trackColor} 100%)`;
        }

        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: duration || 0,
                    playbackRate: playbackSpeed,
                    position: currentTime || 0,
                });
            } catch (e) {
                // Silently ignore
            }
        }
    }, [dispatch, uiTheme?.darkMode, playbackSpeed]);

    const { activeAudioRef, inactiveAudioRef, isBuffering, seek } = useAudioPlayback({
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
        onSongChange: handleSongChange,
        onTimeUpdate: handleTimeUpdate
    });

    useEffect(() => {
        if (activeAudioRef.current) {
            try {
                activeAudioRef.current.playbackRate = playbackSpeed;
            } catch (e) {
                console.warn("Failed to set playback rate", e);
            }
        }
    }, [playbackSpeed, activeAudioRef]);

    const handleManualSeek = useCallback((time: number) => {
        seek(time);
        if (isHost && isJoined && !isInternalAction.current) {
            broadcast('seek', { time });
        }
    }, [seek, isHost, isJoined, isInternalAction, broadcast]);

    useMediaSession({
        currentSong,
        isPlaying,
        imageUrl,
        onPlay: () => {
            dispatch(playMusic(currentSong));
            if (isHost && isJoined) broadcast('play', { song: currentSong });
        },
        onPause: () => {
            dispatch(pauseMusic());
            if (isHost && isJoined) broadcast('pause', {});
        },
        onNext: () => dispatch(nextSong({ isManual: true })),
        onPrev: () => dispatch(prevSongAction()),
        onSeek: handleManualSeek
    });

    // Revoke image URLs and cleanup
    useEffect(() => {
        return () => {
            imageUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            imageUrlsRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (currentSong) {
            getOfflineSong(currentSong.id).then(offlineSong => {
                let url = '';
                if (offlineSong?.imageBlob) {
                    url = URL.createObjectURL(offlineSong.imageBlob);
                    imageUrlsRef.current.add(url);
                } else {
                    url = typeof currentSong.image === 'string'
                        ? currentSong.image
                        : currentSong.image?.[(currentSong.image?.length || 0) - 1]?.url || '';
                }
                setImageUrl(url);
            });
        }
    }, [currentSong?.id]);

    useEffect(() => {
        if (imageUrl) {
            getDominantColor(imageUrl).then(color => {
                if (uiTheme?.accentColor !== color) dispatch(setAccentColor(color));
            });
        }
    }, [imageUrl, dispatch, uiTheme?.accentColor]);

    const recommendationsCacheRef = useRef(recommendationsCache);
    useEffect(() => { recommendationsCacheRef.current = recommendationsCache; }, [recommendationsCache]);

    useEffect(() => {
        if (currentSong && !recommendationsCacheRef.current[currentSong.id]) {
            musicApi.getSuggestions(currentSong.id)
                .then(data => {
                    if (data) {
                        dispatch(setRecommendations({ songId: currentSong.id, recommendations: data }));
                    }
                }).catch(err => console.error('Error fetching recommendations:', err));
        }
    }, [currentSong?.id, dispatch]);

    const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newPercentage = parseFloat(event.target.value);
        const duration = activeAudioRef.current?.duration || 0;
        handleManualSeek((newPercentage / 100) * duration);
    };

    const handleDoubleTap = (side: 'left' | 'right') => {
        const current = activeAudioRef.current?.currentTime || 0;
        const duration = activeAudioRef.current?.duration || 0;
        const seekAmount = side === 'left' ? -10 : 10;
        handleManualSeek(Math.max(0, Math.min(duration, current + seekAmount)));
        setSeekAnimation(side === 'left' ? 'backward' : 'forward');
        setTimeout(() => setSeekAnimation(null), 500);
    };

    const handleDownloadSong = async () => {
        if (!currentSong) return;
        setIsDownloading(true);
        try {
            const songUrl = activeAudioRef.current?.src || '';
            const res = await fetch(songUrl);
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${currentSong.name}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) { console.warn('Error downloading the song', error); } finally { setIsDownloading(false); }
    };

    const handleShare = async () => {
        const songUrl = window.location.origin + `/albums/${currentSong?.albumId}`;
        if (navigator.share) {
            try { await navigator.share({ title: currentSong?.name, text: `Check out ${currentSong?.name} on Vibe On!`, url: songUrl }); } catch (error) { console.log('Error sharing', error); }
        } else {
            navigator.clipboard.writeText(songUrl);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <>
        <AnimatePresence>
            {currentSong && (
                <motion.div
                    key="mini-player" data-testid="mini-player" initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, scale: isPlaying ? 1 : [0.98, 0.97, 0.98] }}
                    transition={{ scale: isPlaying ? { duration: 0.3 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }, y: { type: 'spring', damping: 20, stiffness: 100 } }}
                    exit={{ y: 100, opacity: 0 }} whileTap={{ scale: 0.96 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }}
                    onDragEnd={(_, info) => { if (info.offset.y < -50) dispatch(setPlayerExpanded(true)); }}
                    onClick={() => dispatch(setPlayerExpanded(true))}
                    className={`dark:text-white fixed bottom-[var(--player-pill-bottom)] left-3 right-3 md:bottom-0 md:left-0 md:right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border border-white/30 dark:border-white/10 md:border-t flex flex-col z-[210] rounded-[28px] md:rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] md:shadow-none cursor-pointer transition-all duration-500 ease-out ${uiTheme?.isOled ? 'dark:!bg-black/80' : ''}`}
                    style={{ '--player-pill-bottom': '72px' } as React.CSSProperties}
                >
                    <div className="absolute inset-0 z-0 rounded-[28px] md:rounded-none overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 z-0 pointer-events-none md:hidden opacity-30">
                            <motion.div
                                animate={{ scale: isPlaying ? [1, 1.5, 1] : 1, x: isPlaying ? [0, 100, 0] : 0, y: isPlaying ? [0, -50, 0] : 0, opacity: isPlaying ? [0.3, 0.5, 0.3] : 0.2 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[80px]"
                                style={{ background: 'rgba(var(--accent-rgb), 0.5)' }}
                            />
                        </div>
                        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                            <Visualizer audioRefs={[activeAudioRef, inactiveAudioRef]} isPlaying={isPlaying} />
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-2.5 px-4 md:py-3 md:px-4 lg:px-8 relative">
                        <div className="absolute top-0 left-6 right-6 md:left-0 md:right-0 hidden md:block">
                            <input type="range" id="progress" min={0} max={100} step="0.1" defaultValue={0} onChange={handleProgressChange} onClick={(e) => e.stopPropagation()} className="w-full h-[2px] md:h-[3px] cursor-pointer appearance-none bg-transparent" />
                        </div>

                        <MiniPlayerMetadata
                            imageUrl={imageUrl}
                            name={currentSong.name}
                            artists={currentSong.primaryArtists}
                            isBuffering={isBuffering}
                            onDoubleTap={handleDoubleTap}
                        />

                        <PlayerControls
                            isPlaying={isPlaying}
                            shuffle={shuffle}
                            repeatMode={repeatMode}
                            accentColor={uiTheme?.accentColor || '#ef4444'}
                            onPlayPause={(e) => { e.stopPropagation(); dispatch(playMusic(currentSong)); }}
                            onNext={(e) => { e.stopPropagation(); dispatch(nextSong({ isManual: true })); }}
                            onPrev={(e) => { e.stopPropagation(); dispatch(prevSongAction()); }}
                            onToggleShuffle={(e) => { e.stopPropagation(); dispatch(toggleShuffle()); }}
                            onToggleRepeat={(e) => { e.stopPropagation(); dispatch(toggleRepeatMode()); }}
                        />

                        <div className="flex lg:w-[30vw] justify-end items-center gap-2 md:gap-5">
                            {/* Mobile Controls */}
                            <div className="flex md:hidden items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); dispatch(playMusic(currentSong)); }} className="relative w-10 h-10 flex items-center justify-center rounded-xl text-primary" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }}>{isPlaying ? <FaPause size={18} /> : <FaPlay size={18} className="ml-1" />}</motion.button>
                                <IoMdSkipForward onClick={(e) => { e.stopPropagation(); dispatch(nextSong({ isManual: true })); }} size={22} className="w-10 h-10 p-2" />
                            </div>

                            <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); dispatch(setSessionModalOpen(true)); }} className="hidden md:block">
                                <IoPeopleOutline className={`text-2xl cursor-pointer hover:text-primary ${isJoined ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`} />
                            </motion.button>

                            <PlayerActions
                                isFavorite={isFavorite}
                                isQueueOpen={isQueueOpen}
                                isSongRadioEnabled={isSongRadioEnabled}
                                visualizerStyle={visualizerStyle}
                                playbackSpeed={playbackSpeed}
                                userVolume={userVolume}
                                isMoreMenuOpen={isMoreMenuOpen}
                                isDownloading={isDownloading}
                                accentColor={uiTheme?.accentColor || '#ef4444'}
                                onToggleFavorite={() => { dispatch(toggleFavoriteCloud(currentSong!) as any); setIsMoreMenuOpen(false); }}
                                onToggleQueue={() => { dispatch(setQueueOpen(!isQueueOpen)); setIsMoreMenuOpen(false); }}
                                onOpenPlaylistModal={() => { dispatch(openPlaylistModal(currentSong!)); setIsMoreMenuOpen(false); }}
                                onOpenEqualizer={() => { dispatch(setEqualizerOpen(true)); setIsMoreMenuOpen(false); }}
                                onSetVisualizerStyle={(style) => { dispatch(setVisualizerStyle(style)); setIsMoreMenuOpen(false); }}
                                onToggleRadio={() => { dispatch(setSongRadioEnabled(!isSongRadioEnabled)); setIsMoreMenuOpen(false); }}
                                onDownload={() => { handleDownloadSong(); setIsMoreMenuOpen(false); }}
                                onShare={() => { handleShare(); setIsMoreMenuOpen(false); }}
                                onSetPlaybackSpeed={setPlaybackSpeed}
                                onSetVolume={setUserVolume}
                                onToggleMoreMenu={(e) => { e.stopPropagation(); setIsMoreMenuOpen(!isMoreMenuOpen); }}
                                moreMenuRef={moreMenuRef}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <MobileNowPlaying isOpen={isPlayerExpanded} onClose={() => dispatch(setPlayerExpanded(false))} handlePlayPause={() => dispatch(playMusic(currentSong))} handleProgressChange={handleProgressChange} handleSeek={handleManualSeek} imageUrl={imageUrl || ''} audioRefs={[activeAudioRef, inactiveAudioRef]} onOpenSession={() => dispatch(setSessionModalOpen(true))} />
        <SessionModal isOpen={isSessionModalOpen} onClose={() => dispatch(setSessionModalOpen(false))} onSendReaction={sendReaction} />
        <div className="fixed bottom-32 right-8 w-32 h-64 pointer-events-none z-[250] overflow-hidden"><AnimatePresence>{reactions.map((r) => <FloatingEmoji key={r.id} reaction={r} />)}</AnimatePresence></div>
        {isLyricsOpen && currentSong && !isPlayerExpanded && (
            <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xl flex flex-col">
                 <Lyrics isOpen={true} onClose={() => dispatch(setLyricsOpen(false))} songId={currentSong.id} songName={currentSong.name} artistName={currentSong.primaryArtists} onSeek={handleManualSeek} />
            </div>
        )}
        </>
    );
};

const FloatingEmoji = React.memo(({ reaction }: { reaction: any }) => {
    return (
        <motion.div initial={{ opacity: 0, y: 200, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], y: -100, scale: [0.5, 1.2, 1, 0.8] }} transition={{ duration: 4 }} className="absolute bottom-0 text-4xl">
            {reaction.emoji}
        </motion.div>
    );
});
FloatingEmoji.displayName = 'FloatingEmoji';

export default Player;
