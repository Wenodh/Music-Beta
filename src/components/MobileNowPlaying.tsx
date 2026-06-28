import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoChevronDown, IoHeartOutline, IoHeart, IoAddCircleOutline } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { BiRepeat } from 'react-icons/bi';
import { PiShuffleBold, PiRepeatOnceBold } from 'react-icons/pi';
import { MdOutlineLyrics, MdOutlineGraphicEq } from 'react-icons/md';
import { IoPeopleOutline, IoEllipsisHorizontal } from 'react-icons/io5';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen } from '../features/ui/uiSlice';
import { usePlayback } from '../hooks/usePlayback';
import { usePlayerPreferences } from '../hooks/usePlayerPreferences';
import { useQueue } from '../hooks/useQueue';
import { usePlayerUIState } from '../hooks/usePlayerUIState';

// Lazy components
const Visualizer = React.lazy(() => import('./Visualizer'));
const Lyrics = React.lazy(() => import('./Lyrics'));
const QueueContent = React.lazy(() => import('./Queue').then(module => ({ default: module.QueueContent })));
import MoreMenuOverlay from './player/overlays/MoreMenuOverlay';
import TrackInfoOverlay from './player/overlays/TrackInfoOverlay';

interface MobileNowPlayingProps {
    isOpen: boolean;
    onClose: () => void;
    handlePlayPause: () => void;
    handleProgressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleSeek?: (time: number) => void;
    imageUrl: string;
    audioRefs: React.RefObject<HTMLAudioElement>[];
    onOpenSession?: () => void;
    currentTime: number;
}

const MobileNowPlaying: React.FC<MobileNowPlayingProps> = ({
    isOpen,
    onClose,
    handlePlayPause,
    handleProgressChange,
    handleSeek,
    imageUrl,
    audioRefs,
    onOpenSession,
    currentTime
}) => {
    const dispatch = useAppDispatch();
    const { isPlaying, currentSong, playNext, playPrev, playSpecific } = usePlayback();
    const { visualizerStyle, repeatMode, shuffle, changeVisualizerStyle, handleToggleShuffle, handleToggleRepeat } = usePlayerPreferences();
    const { queue } = useQueue();
    const { accentColor, isJoined } = useAppSelector(state => ({
        accentColor: state.ui.theme?.accentColor || '#ef4444',
        isJoined: state.session.isJoined
    }));
    const { favorites } = useAppSelector(state => state.library);
    const { recommendations } = useAppSelector(state => state.musicPlayer);
    const { reactions } = useAppSelector(state => state.session);

    // States for overlays
    const [isLyricsOverlayOpen, setIsLyricsOverlayOpen] = useState(false);
    const [isQueueOverlayOpen, setIsQueueOverlayOpen] = useState(false);
    const [isInfoOverlayOpen, setIsInfoOverlayOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const [exitDirection, setExitDirection] = useState<number>(0);
    const [moveDirection, setMoveDirection] = useState<'forward' | 'backward' | 'none'>('none');

    const onNext = useCallback(() => {
        setExitDirection(-1000);
        setMoveDirection('forward');
        playNext();
    }, [playNext]);

    const onPrev = useCallback(() => {
        setExitDirection(1000);
        setMoveDirection('backward');
        playPrev();
    }, [playPrev]);

    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    const songStack = useMemo(() => {
        if (!currentSong || !Array.isArray(queue) || queue.length === 0) return [];
        const stack = [];
        const safeIndex = Math.max(0, currentIndex);
        for (let i = 0; i < Math.min(3, queue.length); i++) {
            const index = (safeIndex + i) % queue.length;
            const song = queue[index];
            if (song) stack.push(song);
        }
        return stack;
    }, [currentSong, queue, currentIndex]);

    const getSongImage = (song: any) => {
        if (!song) return '';
        return Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image;
    };

    const isFavorite = favorites.some(s => s.id === currentSong?.id);

    if (!currentSong) return null;

    const duration = parseFloat(currentSong.duration?.toString() || '0');
    const progress = (currentTime / (duration || 1)) * 100;

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                        if (info.offset.y > 100 || info.velocity.y > 500) {
                            onClose();
                        }
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
                    data-testid="expanded-player"
                    className="fixed inset-0 z-[220] bg-gray-950 flex flex-col text-white overflow-hidden"
                >
                    {/* Full Background Visualizer */}
                    <div className="absolute inset-0 z-0">
                        <motion.div
                            className="absolute inset-0 opacity-30 blur-[120px] saturate-[2]"
                            style={{ backgroundColor: accentColor }}
                        />
                        <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                    </div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between p-2 sm:p-4">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <IoChevronDown className="w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <div className="text-center flex-1 px-2 sm:px-4">
                            <p className="hidden xs:block text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Now Playing</p>
                            <p className="text-xs sm:text-sm font-bold truncate max-w-[220px] mx-auto">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || '')}</p>
                        </div>
                        <button
                            onClick={() => dispatch(openPlaylistModal(currentSong!))}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <IoAddCircleOutline className="w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                    </div>

                    {/* Main Layout Container */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-4 pb-8 sm:py-8 overflow-hidden gap-y-6 sm:gap-y-10">

                        {/* Card Stack */}
                        <div
                            className="relative w-full aspect-square max-w-[300px] xs:max-w-[340px] sm:max-w-[400px] max-h-[42vh] z-[20] flex items-center justify-center mx-auto"
                            style={{ perspective: '1200px' }}
                        >
                            <AnimatePresence mode="popLayout">
                                {songStack.slice().reverse().map((song, index) => {
                                    const stackIndex = songStack.length - 1 - index;
                                    const isTop = stackIndex === 0;

                                    return (
                                        <motion.div
                                            key={song.id}
                                            style={{ zIndex: 50 - stackIndex }}
                                            initial={moveDirection === 'backward' && isTop ? { x: -1000, rotate: -45, opacity: 0 } : { scale: 0.8, y: 20, opacity: 0 }}
                                            animate={{
                                                scale: 1 - stackIndex * 0.08,
                                                y: stackIndex * 15,
                                                z: -stackIndex * 150,
                                                opacity: 1 - stackIndex * 0.3,
                                                x: 0, rotate: 0
                                            }}
                                            exit={{
                                                x: isTop ? exitDirection : 0,
                                                opacity: 0,
                                                rotate: isTop ? (exitDirection > 0 ? 45 : -45) : 0,
                                                transition: { duration: 0.4 }
                                            }}
                                            drag={isTop ? "x" : false}
                                            dragConstraints={{ left: 0, right: 0 }}
                                            onDragEnd={(_, info) => {
                                                if (isTop) {
                                                    if (info.offset.x > 100) onPrev();
                                                    else if (info.offset.x < -100) onNext();
                                                }
                                            }}
                                            className="absolute inset-0"
                                        >
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={getSongImage(song)}
                                                    alt=""
                                                    className="w-full h-full object-cover rounded-[2rem] shadow-2xl border border-white/10"
                                                />
                                                {isTop && (
                                                    <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-primary/20 to-transparent pointer-events-none" />
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                        </div>

                        {/* Content Group (Info, Progress, Controls) */}
                        <div className="w-full max-w-[320px] sm:max-w-[380px] flex flex-col gap-y-4 sm:gap-y-6 relative z-10">
                            {/* Song Info */}
                            <div className="relative w-full flex items-center justify-center px-2">
                                <div className="flex-1 min-w-0 text-center">
                                    <h2 className="text-xl sm:text-2xl font-black truncate leading-tight mb-0.5">{decodeHtmlEntities(currentSong.name)}</h2>
                                    <p className="text-sm sm:text-lg text-primary font-bold opacity-90 truncate">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
                                </div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                    <button
                                        onClick={() => dispatch(toggleFavoriteCloud(currentSong!) as any)}
                                        className="shrink-0 p-2 active:scale-90 transition-transform"
                                    >
                                        {isFavorite ? <IoHeart className="text-primary w-7 h-7 sm:w-8 sm:h-8 shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]" /> : <IoHeartOutline className="w-7 h-7 sm:w-8 sm:h-8" />}
                                    </button>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="w-full">
                                <input
                                    type="range"
                                    min={0} max={100} step="0.1"
                                    value={progress}
                                    onChange={handleProgressChange}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary mb-3"
                                    style={{ background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${progress}%, rgba(255,255,255,0.1) ${progress}%, rgba(255,255,255,0.1) 100%)` }}
                                />
                                <div className="flex justify-between text-[10px] sm:text-xs font-bold text-gray-400 px-1">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="w-full flex items-center justify-between">
                                <button
                                    data-testid="shuffle-button"
                                    onClick={handleToggleShuffle}
                                    className={`p-2 transition-all ${shuffle ? 'text-white' : 'text-gray-500'}`}
                                >
                                    <PiShuffleBold className="w-5 h-5 sm:w-6 sm:h-6" style={shuffle ? { color: accentColor } : {}} />
                                </button>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <IoMdSkipBackward onClick={onPrev} className="w-8 h-8 sm:w-9 sm:h-9 cursor-pointer" />
                                    <div onClick={handlePlayPause} className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform">
                                        {isPlaying ? <FaPause className="w-6 h-6 sm:w-7 sm:h-7" /> : <FaPlay className="w-6 h-6 sm:w-7 sm:h-7 ml-1" />}
                                    </div>
                                    <IoMdSkipForward onClick={onNext} className="w-8 h-8 sm:w-9 sm:h-9 cursor-pointer" />
                                </div>
                                <button
                                    data-testid="repeat-button"
                                    onClick={handleToggleRepeat}
                                    className={`p-2 transition-all ${repeatMode !== 'none' ? 'text-white' : 'text-gray-500'}`}
                                >
                                    {repeatMode === 'one' ? (
                                        <PiRepeatOnceBold className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: accentColor }} />
                                    ) : (
                                        <BiRepeat className="w-5 h-5 sm:w-6 sm:h-6" style={repeatMode === 'all' ? { color: accentColor } : {}} />
                                    )}
                                </button>
                            </div>

                            {/* Options Bar */}
                            <div className="w-full flex items-center justify-around bg-white/5 backdrop-blur-xl rounded-3xl p-1 border border-white/10">
                                <button
                                    onClick={() => setIsLyricsOverlayOpen(true)}
                                    className="p-4 flex flex-col items-center gap-1 active:scale-90 transition-all"
                                >
                                    <MdOutlineLyrics size={24} className="text-gray-300" />
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Lyrics</span>
                                </button>
                                <button
                                    onClick={() => onOpenSession?.()}
                                    className="p-4 flex flex-col items-center gap-1 active:scale-90 transition-all"
                                >
                                    <IoPeopleOutline size={24} className={isJoined ? 'text-primary' : 'text-gray-300'} />
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Session</span>
                                </button>
                                <button
                                    onClick={() => dispatch(openPlaylistModal(currentSong!))}
                                    className="p-4 flex flex-col items-center gap-1 active:scale-90 transition-all"
                                >
                                    <IoAddCircleOutline size={24} className="text-gray-300" />
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Add</span>
                                </button>
                                <button
                                    onClick={() => setIsMoreMenuOpen(true)}
                                    className="p-4 flex flex-col items-center gap-1 active:scale-90 transition-all"
                                >
                                    <IoEllipsisHorizontal size={24} className="text-gray-300" />
                                    <span className="text-[10px] font-bold uppercase text-gray-500">More</span>
                                </button>
                            </div>
                    </div>

                    {/* Reaction Overlay */}
                    <div className="absolute inset-0 pointer-events-none z-[55] overflow-hidden">
                        <AnimatePresence>
                            {reactions.map((r) => (
                                <FloatingEmojiMobile key={r.id} reaction={r} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* OVERLAYS */}
                <MoreMenuOverlay
                    isOpen={isMoreMenuOpen}
                    onClose={() => setIsMoreMenuOpen(false)}
                    visualizerStyle={visualizerStyle}
                    onSetVisualizerStyle={changeVisualizerStyle}
                    onOpenQueue={() => { setIsQueueOverlayOpen(true); setIsMoreMenuOpen(false); }}
                    onOpenInfo={() => { setIsInfoOverlayOpen(true); setIsMoreMenuOpen(false); }}
                    onOpenEqualizer={() => { dispatch(setEqualizerOpen(true)); setIsMoreMenuOpen(false); }}
                    onOpenPlaylist={() => { dispatch(openPlaylistModal(currentSong!)); setIsMoreMenuOpen(false); }}
                    accentColor={accentColor}
                />

                <TrackInfoOverlay
                    isOpen={isInfoOverlayOpen}
                    onClose={() => setIsInfoOverlayOpen(false)}
                    song={currentSong}
                    imageUrl={imageUrl}
                    recommendations={recommendations}
                    onPlayTrack={(s) => { playSpecific(s); setIsInfoOverlayOpen(false); }}
                    formatTime={formatTime}
                />

                {/* Lyrics Overlay */}
                <AnimatePresence>
                    {isLyricsOverlayOpen && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-0 z-[230] bg-black/90 backdrop-blur-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold">Lyrics</h2>
                                <button onClick={() => setIsLyricsOverlayOpen(false)} className="p-2 bg-white/10 rounded-full">
                                    <IoChevronDown size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Lyrics
                                    isOpen={true}
                                    onClose={() => setIsLyricsOverlayOpen(false)}
                                    songId={currentSong.id}
                                    songName={currentSong.name}
                                    artistName={currentSong.primaryArtists}
                                    onSeek={handleSeek}
                                    currentTime={currentTime}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Queue Overlay */}
                <AnimatePresence>
                    {isQueueOverlayOpen && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-0 z-[230] bg-black/90 backdrop-blur-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold">Queue</h2>
                                    <span className="text-xs text-gray-500 font-bold">{(queue || []).length} Tracks</span>
                                </div>
                                <button onClick={() => setIsQueueOverlayOpen(false)} className="p-2 bg-white/10 rounded-full">
                                    <IoChevronDown size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <QueueContent />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

const FloatingEmojiMobile = React.memo(({ reaction }: { reaction: any }) => {
    const randomX = React.useRef(Math.random() * 80 - 40).current;
    const duration = React.useRef(3 + Math.random() * 2).current;
    const delay = React.useRef(Math.random() * 0.2).current;

    return (
        <motion.div
            initial={{ opacity: 0, y: '110vh', x: `calc(50% + ${randomX}px)`, scale: 0.5 }}
            animate={{
                opacity: [0, 1, 1, 0],
                y: '-10vh',
                x: [`calc(50% + ${randomX}px)`, `calc(50% + ${randomX + 30}px)`, `calc(50% + ${randomX - 30}px)`, `calc(50% + ${randomX}px)`],
                scale: [0.5, 1.5, 1.2, 0.8]
            }}
            exit={{ opacity: 0 }}
            transition={{
                duration: duration,
                ease: "easeOut",
                delay: delay,
                x: {
                    duration: duration,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }
            }}
            className="absolute bottom-0 text-5xl filter drop-shadow-2xl"
        >
            <div className="relative group">
                <span className="block">{reaction.emoji}</span>
                <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 text-[12px] font-bold bg-black/60 text-white px-3 py-1 rounded-full whitespace-nowrap"
                >
                    {reaction.userName}
                </motion.span>
            </div>
        </motion.div>
    );
});
FloatingEmojiMobile.displayName = 'FloatingEmojiMobile';

export default MobileNowPlaying;
