import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoChevronDown, IoEllipsisHorizontal, IoHeartOutline, IoHeart, IoAddCircleOutline, IoOptionsOutline, IoClose } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { BiRepeat } from 'react-icons/bi';
import { PiShuffleBold, PiRepeatOnceBold } from 'react-icons/pi';
import { MdOutlineLyrics, MdOutlineGraphicEq, MdBarChart, MdShowChart, MdBubbleChart, MdDonutLarge, MdApps } from 'react-icons/md';
import { HiQueueList } from 'react-icons/hi2';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { playMusic, setCurrentTime, setVisualizerStyle, nextSong as nextSongAction, prevSong as prevSongAction, toggleRepeatMode, toggleShuffle } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen } from '../features/ui/uiSlice';
import Visualizer from './Visualizer';
import Lyrics from './Lyrics';
import { QueueContent } from './Queue';

interface MobileNowPlayingProps {
    isOpen: boolean;
    onClose: () => void;
    handlePlayPause: () => void;
    handleProgressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleSeek?: (time: number) => void;
    imageUrl: string;
    audioRefs: React.RefObject<HTMLAudioElement>[];
}

const MobileNowPlaying: React.FC<MobileNowPlayingProps> = ({
    isOpen,
    onClose,
    handlePlayPause,
    handleProgressChange,
    handleSeek,
    imageUrl,
    audioRefs
}) => {
    const dispatch = useAppDispatch();
    const { currentSong, isPlaying, currentTime, recommendations, songs, visualizerStyle, repeatMode, shuffle } = useAppSelector(state => state.musicPlayer);
    const { favorites } = useAppSelector(state => state.library);
    const { theme } = useAppSelector(state => state.ui);

    // States for overlays
    const [isLyricsOverlayOpen, setIsLyricsOverlayOpen] = useState(false);
    const [isQueueOverlayOpen, setIsQueueOverlayOpen] = useState(false);
    const [isInfoOverlayOpen, setIsInfoOverlayOpen] = useState(false);

    const [exitDirection, setExitDirection] = useState<number>(0);
    const [moveDirection, setMoveDirection] = useState<'forward' | 'backward' | 'none'>('none');
    const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);

    const handleNext = () => {
        setExitDirection(-1000);
        setMoveDirection('forward');
        dispatch(nextSongAction());
    };

    const handlePrev = () => {
        setExitDirection(1000);
        setMoveDirection('backward');
        dispatch(prevSongAction());
    };

    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const songStack = useMemo(() => {
        if (!currentSong || songs.length === 0) return [];
        const stack = [];
        const safeIndex = Math.max(0, currentIndex);
        for (let i = 0; i < Math.min(3, songs.length); i++) {
            const index = (safeIndex + i) % songs.length;
            const song = songs[index];
            if (song) stack.push(song);
        }
        return stack;
    }, [currentSong, songs, currentIndex]);

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
                    transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
                    className="fixed inset-0 z-[220] bg-gray-950 flex flex-col text-white overflow-hidden"
                >
                    {/* Full Background Visualizer */}
                    <div className="absolute inset-0 z-0">
                        <motion.div
                            className="absolute inset-0 opacity-30 blur-[120px] saturate-[2]"
                            style={{ backgroundColor: theme.accentColor }}
                        />
                        <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                    </div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between p-6">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <IoChevronDown size={28} />
                        </button>
                        <div className="text-center flex-1 px-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Now Playing</p>
                            <p className="text-xs font-bold truncate max-w-[200px] mx-auto">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || '')}</p>
                        </div>
                        <button
                            onClick={() => dispatch(openPlaylistModal(currentSong!))}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <IoAddCircleOutline size={28} />
                        </button>
                    </div>

                    {/* Main Layout Container */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-8 overflow-hidden">

                        {/* Card Stack & Floating Menu */}
                        <div
                            className="relative w-full aspect-square max-w-[320px] mb-4"
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
                                                y: stackIndex * 25,
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
                                                    if (info.offset.x > 100) handlePrev();
                                                    else if (info.offset.x < -100) handleNext();
                                                }
                                            }}
                                            className="absolute inset-0"
                                        >
                                            <img
                                                src={getSongImage(song)}
                                                alt=""
                                                className="w-full h-full object-cover rounded-3xl shadow-2xl border border-white/10"
                                            />
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {/* New Floating Menu (Top Right) */}
                            <div className="absolute top-4 right-4 z-[60]">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsFloatingMenuOpen(!isFloatingMenuOpen)}
                                    className="p-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl"
                                >
                                    {isFloatingMenuOpen ? <IoClose size={24} /> : <IoOptionsOutline size={24} />}
                                </motion.button>

                                <AnimatePresence>
                                    {isFloatingMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, x: 20, y: -20 }}
                                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, x: 20, y: -20 }}
                                            className="absolute top-14 right-0 flex flex-col gap-2 bg-black/60 backdrop-blur-2xl p-2 rounded-3xl border border-white/10 shadow-2xl min-w-[56px]"
                                        >
                                            {[
                                                { icon: <MdOutlineLyrics size={24} />, onClick: () => { setIsLyricsOverlayOpen(true); setIsFloatingMenuOpen(false); } },
                                                { icon: <HiQueueList size={24} />, onClick: () => { setIsQueueOverlayOpen(true); setIsFloatingMenuOpen(false); } },
                                                { icon: <MdApps size={24} />, onClick: () => { setIsInfoOverlayOpen(true); setIsFloatingMenuOpen(false); } },
                                                { icon: <MdOutlineGraphicEq size={24} />, onClick: () => { dispatch(setEqualizerOpen(true)); setIsFloatingMenuOpen(false); } },
                                            ].map((item, i) => (
                                                <button
                                                    key={i}
                                                    onClick={item.onClick}
                                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors active:scale-90"
                                                >
                                                    {item.icon}
                                                </button>
                                            ))}

                                            <div className="h-px bg-white/10 my-1 mx-2" />

                                            {/* Visualizer Style Quick Selection inside menu */}
                                            <div className="flex flex-col gap-2">
                                                {[
                                                    { id: 'bars', icon: <MdBarChart size={20} /> },
                                                    { id: 'waveform', icon: <MdShowChart size={20} /> },
                                                    { id: 'particles', icon: <MdBubbleChart size={20} /> },
                                                    { id: 'circular', icon: <MdDonutLarge size={20} /> },
                                                    { id: 'pixel', icon: <MdApps size={20} /> }
                                                ].map(style => (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => {
                                                            dispatch(setVisualizerStyle(style.id as any));
                                                            setIsFloatingMenuOpen(false);
                                                        }}
                                                        className={`p-3 rounded-2xl transition-all ${visualizerStyle === style.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'}`}
                                                    >
                                                        {style.icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Song Info */}
                        <div className="w-full max-w-[320px] mb-2 flex items-end justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                                <h2 className="text-2xl font-black truncate">{decodeHtmlEntities(currentSong.name)}</h2>
                                <p className="text-lg text-primary font-bold opacity-90 truncate">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
                            </div>
                            <button onClick={() => dispatch(toggleFavoriteCloud(currentSong!) as any)}>
                                {isFavorite ? <IoHeart className="text-primary" size={32} /> : <IoHeartOutline size={32} />}
                            </button>
                        </div>

                        {/* Progress */}
                        <div className="w-full max-w-[320px] mb-4">
                            <input
                                type="range"
                                min={0} max={100} step="0.1"
                                value={progress}
                                onChange={handleProgressChange}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary mb-2"
                                style={{ background: `linear-gradient(to right, ${theme.accentColor} 0%, ${theme.accentColor} ${progress}%, rgba(255,255,255,0.1) ${progress}%, rgba(255,255,255,0.1) 100%)` }}
                            />
                            <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="w-full max-w-[320px] flex items-center justify-between mb-2">
                            <button
                                data-testid="shuffle-button"
                                onClick={() => dispatch(toggleShuffle())}
                                className={`p-2 transition-all ${shuffle ? 'text-white' : 'text-gray-500'}`}
                            >
                                <PiShuffleBold size={24} style={shuffle ? { color: theme.accentColor } : {}} />
                            </button>
                            <div className="flex items-center gap-6">
                                <IoMdSkipBackward size={36} onClick={handlePrev} className="cursor-pointer" />
                                <div onClick={handlePlayPause} className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform">
                                    {isPlaying ? <FaPause size={28} /> : <FaPlay size={28} className="ml-1" />}
                                </div>
                                <IoMdSkipForward size={36} onClick={handleNext} className="cursor-pointer" />
                            </div>
                            <button
                                data-testid="repeat-button"
                                onClick={() => dispatch(toggleRepeatMode())}
                                className={`p-2 transition-all ${repeatMode !== 'none' ? 'text-white' : 'text-gray-500'}`}
                            >
                                {repeatMode === 'one' ? (
                                    <PiRepeatOnceBold size={24} style={{ color: theme.accentColor }} />
                                ) : (
                                    <BiRepeat size={24} style={repeatMode === 'all' ? { color: theme.accentColor } : {}} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* OVERLAYS */}

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
                                        <span className="text-xs text-gray-500 font-bold">{songs.length} Tracks</span>
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

                    {/* Info Overlay */}
                    <AnimatePresence>
                        {isInfoOverlayOpen && (
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed inset-0 z-[230] bg-black/90 backdrop-blur-2xl flex flex-col"
                            >
                                <div className="flex items-center justify-between p-6 border-b border-white/10">
                                    <h2 className="text-xl font-bold">Track Info</h2>
                                    <button onClick={() => setIsInfoOverlayOpen(false)} className="p-2 bg-white/10 rounded-full">
                                        <IoChevronDown size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="space-y-8">
                                        <div className="flex gap-6 items-center">
                                            <img src={imageUrl} alt="" className="w-32 h-32 rounded-3xl shadow-2xl object-cover" />
                                            <div>
                                                <h3 className="text-2xl font-black">{decodeHtmlEntities(currentSong.name)}</h3>
                                                <p className="text-primary font-bold">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { label: 'Album', value: decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || 'Single') },
                                                { label: 'Release Year', value: currentSong.year || 'N/A' },
                                                { label: 'Duration', value: formatTime(duration) },
                                                { label: 'Language', value: currentSong.language || 'N/A' }
                                            ].map(item => (
                                                <div key={item.label} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                                                    <p className="font-bold">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {recommendations.length > 0 && (
                                            <div>
                                                <h4 className="text-lg font-black mb-4">You might also like</h4>
                                                <div className="space-y-3">
                                                    {recommendations.slice(0, 5).map(song => (
                                                        <div
                                                            key={song.id}
                                                            onClick={() => { dispatch(playMusic(song)); setIsInfoOverlayOpen(false); }}
                                                            className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                                                        >
                                                            <img src={Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image} className="w-12 h-12 rounded-xl object-cover" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold truncate">{decodeHtmlEntities(song.name)}</p>
                                                                <p className="text-xs text-gray-400 truncate">{decodeHtmlEntities(song.primaryArtists)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileNowPlaying;
