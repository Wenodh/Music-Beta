import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipForward } from 'react-icons/io';
import { IoPeopleOutline } from 'react-icons/io5';

import { musicApi } from '../services/musicApi';
import { getOfflineSong } from '../utils/db';
import Visualizer from './Visualizer';

// Hooks
import { usePlayback } from '../hooks/usePlayback';
import { useQueue } from '../hooks/useQueue';
import { usePlayerPreferences } from '../hooks/usePlayerPreferences';
import { usePlayerUIState } from '../hooks/usePlayerUIState';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useMediaSession } from '../hooks/useMediaSession';
import { useSession } from '../hooks/useSession';

// Redux Actions (some still needed for direct dispatch in effects)
import { setRecommendations } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setAccentColor, setEqualizerOpen, showToast } from '../features/ui/uiSlice';

// Sub-components
import MiniPlayerMetadata from './player/MiniPlayerMetadata';
import PlayerControls from './player/PlayerControls';
import PlayerActions from './player/PlayerActions';

// Lazy components
const MobileNowPlaying = React.lazy(() => import('./MobileNowPlaying'));
const Lyrics = React.lazy(() => import('./Lyrics'));
import SessionModal from './modals/SessionModal';

const Player = ({ onShowMiniPlayer }: { onShowMiniPlayer?: () => void }) => {
    const dispatch = useAppDispatch();

    // Extracted Logic via Hooks
    const { isPlaying, currentSong, togglePlayPause, playNext, playPrev, playSpecific } = usePlayback();
    const { queue, isQueueOpen, toggleQueue } = useQueue();
    const {
        visualizerStyle, repeatMode, shuffle, isSongRadioEnabled,
        changeVisualizerStyle, handleToggleShuffle, handleToggleRepeat, handleToggleRadio
    } = usePlayerPreferences();
    const {
        isPlayerExpanded, isSessionModalOpen, isLyricsOpen, accentColor, accentRgb, isOled,
        togglePlayerExpanded, toggleSessionModal, toggleLyrics
    } = usePlayerUIState();

    const { broadcast, sendReaction, isInternalAction } = useSession();
    const { isJoined, isHost, reactions } = useAppSelector(state => state.session);
    const { preferredQuality, isGaplessEnabled, crossfadeDuration, recommendations, recommendationsCache } = useAppSelector(state => state.musicPlayer);

    // Local UI State
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const [userVolume, setUserVolume] = useState(0.7);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTimeLocal] = useState(0);
    const [imageUrl, setImageUrl] = useState<string>('');
    const imageUrlsRef = useRef<Set<string>>(new Set());

    const isFavorite = useMemo(() => {
        const favorites = (window as any).__REDUX_STORE__?.getState().library.favorites || [];
        return favorites.some((s: any) => s.id === currentSong?.id);
    }, [currentSong?.id]);

    const handleTimeUpdate = useCallback((time: number, duration: number) => {
        setCurrentTimeLocal(time);
        const progressVal = (time / (duration || 1)) * 100;
        setProgress(progressVal);

        const progressElement = document.getElementById('progress') as HTMLInputElement;
        if (progressElement) {
            progressElement.value = progressVal.toString();
            const trackColor = !isOled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            progressElement.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${progressVal}%, ${trackColor} ${progressVal}%, ${trackColor} 100%)`;
        }

        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: duration || 0,
                    playbackRate: playbackSpeed,
                    position: time || 0,
                });
            } catch (e) {}
        }
    }, [accentColor, isOled, playbackSpeed]);

    const { activeAudioRef, inactiveAudioRef, isBuffering, seek } = useAudioPlayback({
        currentSong,
        songs: queue,
        isPlaying,
        repeatMode,
        shuffle,
        isGaplessEnabled,
        crossfadeDuration,
        preferredQuality,
        userVolume,
        isSongRadioEnabled,
        recommendations,
        onSongChange: (song) => playSpecific(song),
        onTimeUpdate: handleTimeUpdate
    });

    useEffect(() => {
        if (activeAudioRef.current) {
            activeAudioRef.current.playbackRate = playbackSpeed;
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
        onPlay: togglePlayPause,
        onPause: togglePlayPause,
        onNext: () => playNext(true),
        onPrev: playPrev,
        onSeek: handleManualSeek
    });

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
        if (currentSong && !recommendationsCache[currentSong.id]) {
            musicApi.getSuggestions(currentSong.id)
                .then(data => {
                    if (data) dispatch(setRecommendations({ songId: currentSong.id, recommendations: data }));
                });
        }
    }, [currentSong?.id, recommendationsCache, dispatch]);

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
        } catch (error) { console.warn('Error downloading', error); } finally { setIsDownloading(false); }
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
                    onDragEnd={(_, info) => { if (info.offset.y < -50) togglePlayerExpanded(true); }}
                    onClick={() => togglePlayerExpanded(true)}
                    className={`dark:text-white fixed bottom-[var(--player-pill-bottom)] left-3 right-3 md:bottom-0 md:left-0 md:right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border border-white/30 dark:border-white/10 md:border-t flex flex-col z-[210] rounded-[28px] md:rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] md:shadow-none cursor-pointer transition-all duration-500 ease-out ${isOled ? 'dark:!bg-black/80' : ''}`}
                    style={{ '--player-pill-bottom': '72px' } as React.CSSProperties}
                >
                    <div className="absolute inset-0 z-0 rounded-[28px] md:rounded-none overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 z-0 pointer-events-none md:hidden opacity-30">
                            <motion.div
                                animate={{ scale: isPlaying ? [1, 1.5, 1] : 1, x: isPlaying ? [0, 100, 0] : 0, y: isPlaying ? [0, -50, 0] : 0, opacity: isPlaying ? [0.3, 0.5, 0.3] : 0.2 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[80px]"
                                style={{ background: `rgba(${accentRgb}, 0.5)` }}
                            />
                        </div>
                        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                            <Visualizer audioRefs={[activeAudioRef, inactiveAudioRef]} isPlaying={isPlaying} />
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-2.5 px-4 md:py-3 md:px-4 lg:px-8 relative">
                        <div className="absolute top-0 left-6 right-6 md:left-0 md:right-0 hidden md:block">
                            <input
                                type="range" id="progress" min={0} max={100} step="0.1" value={progress}
                                onChange={(e) => seek((parseFloat(e.target.value) / 100) * (activeAudioRef.current?.duration || 0))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-[2px] md:h-[3px] cursor-pointer appearance-none bg-transparent"
                            />
                        </div>

                        <MiniPlayerMetadata
                            imageUrl={imageUrl}
                            name={currentSong.name}
                            artists={currentSong.primaryArtists}
                            isBuffering={isBuffering}
                            onDoubleTap={(side) => {
                                const current = activeAudioRef.current?.currentTime || 0;
                                const seekAmount = side === 'left' ? -10 : 10;
                                seek(Math.max(0, Math.min(activeAudioRef.current?.duration || 0, current + seekAmount)));
                            }}
                        />

                        <PlayerControls
                            isPlaying={isPlaying}
                            shuffle={shuffle}
                            repeatMode={repeatMode}
                            accentColor={accentColor}
                            onPlayPause={(e) => { e.stopPropagation(); togglePlayPause(); }}
                            onNext={(e) => { e.stopPropagation(); playNext(true); }}
                            onPrev={(e) => { e.stopPropagation(); playPrev(); }}
                            onToggleShuffle={(e) => { e.stopPropagation(); handleToggleShuffle(); }}
                            onToggleRepeat={(e) => { e.stopPropagation(); handleToggleRepeat(); }}
                        />

                        <div className="flex lg:w-[30vw] justify-end items-center gap-2 md:gap-5">
                            <div className="flex md:hidden items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} className="relative w-10 h-10 flex items-center justify-center rounded-xl text-primary" style={{ backgroundColor: `rgba(${accentRgb}, 0.1)` }}>{isPlaying ? <FaPause size={18} /> : <FaPlay size={18} className="ml-1" />}</motion.button>
                                <IoMdSkipForward onClick={(e) => { e.stopPropagation(); playNext(true); }} size={22} className="w-10 h-10 p-2" />
                            </div>

                            <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); toggleSessionModal(true); }} className="hidden md:block">
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
                                accentColor={accentColor}
                                onToggleFavorite={() => { dispatch(toggleFavoriteCloud(currentSong!) as any); setIsMoreMenuOpen(false); }}
                                onToggleQueue={() => { toggleQueue(); setIsMoreMenuOpen(false); }}
                                onOpenPlaylistModal={() => { dispatch(openPlaylistModal(currentSong!)); setIsMoreMenuOpen(false); }}
                                onOpenEqualizer={() => { dispatch(setEqualizerOpen(true)); setIsMoreMenuOpen(false); }}
                                onSetVisualizerStyle={(style) => { changeVisualizerStyle(style); setIsMoreMenuOpen(false); }}
                                onToggleRadio={() => { handleToggleRadio(); setIsMoreMenuOpen(false); }}
                                onDownload={() => { handleDownloadSong(); setIsMoreMenuOpen(false); }}
                                onShare={() => {
                                    if (currentSong) {
                                        const songUrl = window.location.origin + `/albums/${currentSong.albumId}`;
                                        if (navigator.share) {
                                            navigator.share({
                                                title: currentSong.name,
                                                text: `Check out ${currentSong.name} on Vibe On!`,
                                                url: songUrl
                                            }).catch(console.error);
                                        } else {
                                            navigator.clipboard.writeText(songUrl);
                                            dispatch(showToast({ message: 'Link copied to clipboard!' }));
                                        }
                                    }
                                    setIsMoreMenuOpen(false);
                                }}
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

        <React.Suspense fallback={null}>
            <MobileNowPlaying
                isOpen={isPlayerExpanded}
                onClose={() => togglePlayerExpanded(false)}
                handlePlayPause={togglePlayPause}
                handleProgressChange={(e) => seek((parseFloat(e.target.value) / 100) * (activeAudioRef.current?.duration || 0))}
                handleSeek={seek}
                imageUrl={imageUrl || ''}
                audioRefs={[activeAudioRef, inactiveAudioRef]}
                onOpenSession={() => toggleSessionModal(true)}
                currentTime={currentTime}
            />
        </React.Suspense>
        <SessionModal isOpen={isSessionModalOpen} onClose={() => toggleSessionModal(false)} onSendReaction={sendReaction} />
        <div className="fixed bottom-32 right-8 w-32 h-64 pointer-events-none z-[250] overflow-hidden"><AnimatePresence>{reactions.map((r) => <FloatingEmoji key={r.id} reaction={r} />)}</AnimatePresence></div>
        {isLyricsOpen && currentSong && !isPlayerExpanded && (
            <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xl flex flex-col">
                 <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-white">Loading Lyrics...</div>}>
                    <Lyrics
                        isOpen={true}
                        onClose={() => toggleLyrics(false)}
                        songId={currentSong.id}
                        songName={currentSong.name}
                        artistName={currentSong.primaryArtists}
                        onSeek={seek}
                        currentTime={currentTime}
                    />
                 </React.Suspense>
            </div>
        )}
        </>
    );
};

const FloatingEmoji = React.memo(({ reaction }: { reaction: any }) => (
    <motion.div initial={{ opacity: 0, y: 200, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], y: -100, scale: [0.5, 1.2, 1, 0.8] }} transition={{ duration: 4 }} className="absolute bottom-0 text-4xl">
        {reaction.emoji}
    </motion.div>
));
FloatingEmoji.displayName = 'FloatingEmoji';

export default Player;
