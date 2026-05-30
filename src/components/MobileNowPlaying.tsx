import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setAccentColor } from '../features/ui/uiSlice';
import { IoChevronDown, IoEllipsisHorizontal, IoHeartOutline, IoHeart, IoAddCircleOutline } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { BiRepeat } from 'react-icons/bi';
import { PiShuffleBold } from 'react-icons/pi';
import { MdOutlineLyrics, MdOutlineGraphicEq, MdBarChart, MdShowChart, MdBubbleChart, MdDonutLarge, MdApps } from 'react-icons/md';
import { HiQueueList } from 'react-icons/hi2';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { playMusic, setQueueOpen, setCurrentTime, setVisualizerStyle, nextSong as nextSongAction, prevSong as prevSongAction } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen } from '../features/ui/uiSlice';
import Visualizer from './Visualizer';
import Lyrics from './Lyrics';
import Queue from './Queue';

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
    const { currentSong, isPlaying, currentTime, recommendations, songs, isQueueOpen: reduxQueueOpen, visualizerStyle } = useAppSelector(state => state.musicPlayer);
    const { favorites } = useAppSelector(state => state.library);
    const { theme, isLyricsOpen: reduxLyricsOpen } = useAppSelector(state => state.ui);
    const [activeSection, setActiveSection] = useState<'player' | 'lyrics' | 'queue' | 'discovery'>('player');
    const [exitDirection, setExitDirection] = useState<number>(0);
    const [moveDirection, setMoveDirection] = useState<'forward' | 'backward' | 'none'>('none');
    const [isVisualizerSelectorOpen, setIsVisualizerSelectorOpen] = useState(false);

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

    // Calculate song stack for Tinder-style swiping
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const songStack = useMemo(() => {
        if (!currentSong || songs.length === 0) return [];
        const stack = [];
        const safeIndex = Math.max(0, currentIndex);
        // Show up to 3 songs in the stack
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

    // Sync with Redux flags when opening
    React.useEffect(() => {
        if (isOpen) {
            if (reduxLyricsOpen) setActiveSection('lyrics');
            else if (reduxQueueOpen) setActiveSection('queue');
            else setActiveSection('player');
        }
    }, [isOpen, reduxLyricsOpen, reduxQueueOpen]);

    // Handle back button on mobile when in a sub-section
    useEffect(() => {
        const handleBack = (e: PopStateEvent) => {
            if (isOpen && activeSection !== 'player') {
                e.preventDefault();
                setActiveSection('player');
            }
        };
        window.addEventListener('popstate', handleBack);
        return () => window.removeEventListener('popstate', handleBack);
    }, [isOpen, activeSection]);

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
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.05}
                    dragDirectionLock
                    onDragEnd={(_, info) => {
                        if (info.offset.y > 100 || info.velocity.y > 500) onClose();
                    }}
                    className="fixed inset-0 z-[220] bg-gray-950 flex flex-col text-white overflow-hidden"
                >
                    {/* Background Gradient & Blur */}
                    <div className="absolute inset-0 z-0">
                        <motion.div
                            className="absolute inset-0 opacity-40 blur-[100px] saturate-[2]"
                            style={{ backgroundColor: theme.accentColor }}
                        />
                        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-150" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-gray-950/80 to-gray-950" />
                    </div>

                    {/* Header - acts as a drag handle */}
                    <div className="relative z-10 flex flex-col shrink-0">
                        <div className="flex items-center justify-between p-6 pb-2">
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <IoChevronDown size={28} />
                            </button>
                            <div className="text-center flex-1 px-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Now Playing</p>
                                <p className="text-xs font-bold truncate">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || '')}</p>
                            </div>
                            <button
                                onClick={() => dispatch(openPlaylistModal(currentSong!))}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <IoAddCircleOutline size={28} />
                            </button>
                        </div>

                        {/* Mobile Segmented Control / Tabs */}
                        <div className="flex lg:hidden items-center justify-center gap-1 p-1 mx-6 mb-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'player', label: 'Music', icon: <FaPlay size={10} /> },
                                { id: 'lyrics', label: 'Lyrics', icon: <MdOutlineLyrics size={14} /> },
                                { id: 'queue', label: 'Queue', icon: <HiQueueList size={14} /> },
                                { id: 'discovery', label: 'Info', icon: <MdApps size={14} /> }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSection(tab.id as any)}
                                    className={`flex-[0_0_auto] min-w-[70px] flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${activeSection === tab.id ? 'bg-white/15 text-white shadow-lg' : 'text-gray-400'}`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="relative z-10 flex-1 overflow-hidden flex flex-col lg:flex-row pointer-events-auto touch-pan-y">
                        {/* Left Column: Player Core */}
                        <div className={`w-full lg:w-[45%] flex flex-col items-center justify-center px-8 py-4 lg:px-12 lg:py-8 lg:border-r lg:border-white/5 relative transition-all duration-500 ${activeSection !== 'player' && activeSection !== 'discovery' ? 'hidden lg:flex' : 'flex'}`}>
                            {/* Desktop Background Accent */}
                            <div className="absolute inset-0 z-0 hidden lg:block opacity-20">
                                <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                            </div>

                            {/* Album Art Card Stack */}
                            <div
                                className="relative w-full aspect-square max-w-[320px] lg:max-w-[380px] mb-12 lg:mb-16 group z-10"
                                style={{ perspective: '1200px' }}
                            >
                                <div className="absolute -inset-8 opacity-30 pointer-events-none">
                                    <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                                </div>

                                {/* Compact Visualizer Style Selector Overlay */}
                                <div className="absolute top-4 right-4 z-[60] flex flex-col items-end gap-2">
                                    <button
                                        onClick={() => setIsVisualizerSelectorOpen(!isVisualizerSelectorOpen)}
                                        className="p-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 text-white shadow-lg active:scale-95 transition-transform"
                                    >
                                        <MdOutlineGraphicEq size={24} className={isPlaying ? 'animate-pulse' : ''} />
                                    </button>

                                    <AnimatePresence>
                                        {isVisualizerSelectorOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                                className="flex flex-col gap-2 bg-black/60 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl"
                                            >
                                                <button
                                                    onClick={() => {
                                                        dispatch(setVisualizerStyle('bars'));
                                                        setIsVisualizerSelectorOpen(false);
                                                    }}
                                                    className={`p-3 rounded-xl transition-all flex items-center gap-3 ${visualizerStyle === 'bars' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    <MdBarChart size={20} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider pr-2">Bars</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        dispatch(setVisualizerStyle('waveform'));
                                                        setIsVisualizerSelectorOpen(false);
                                                    }}
                                                    className={`p-3 rounded-xl transition-all flex items-center gap-3 ${visualizerStyle === 'waveform' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    <MdShowChart size={20} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider pr-2">Wave</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        dispatch(setVisualizerStyle('particles'));
                                                        setIsVisualizerSelectorOpen(false);
                                                    }}
                                                    className={`p-3 rounded-xl transition-all flex items-center gap-3 ${visualizerStyle === 'particles' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    <MdBubbleChart size={20} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider pr-2">Dots</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        dispatch(setVisualizerStyle('circular'));
                                                        setIsVisualizerSelectorOpen(false);
                                                    }}
                                                    className={`p-3 rounded-xl transition-all flex items-center gap-3 ${visualizerStyle === 'circular' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    <MdDonutLarge size={20} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider pr-2">Ring</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        dispatch(setVisualizerStyle('pixel'));
                                                        setIsVisualizerSelectorOpen(false);
                                                    }}
                                                    className={`p-3 rounded-xl transition-all flex items-center gap-3 ${visualizerStyle === 'pixel' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    <MdApps size={20} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider pr-2">Grid</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence mode="popLayout">
                                    {songStack.slice().reverse().map((song, index) => {
                                        const stackIndex = songStack.length - 1 - index; // 0 for top card, 1 for middle, 2 for bottom
                                        const isTop = stackIndex === 0;

                                        return (
                                            <motion.div
                                                key={song.id}
                                                style={{
                                                    zIndex: 50 - stackIndex,
                                                }}
                                                initial={moveDirection === 'backward' && isTop ? {
                                                    x: -1000,
                                                    rotate: -45,
                                                    opacity: 0,
                                                    scale: 1
                                                } : {
                                                    scale: 0.8 - stackIndex * 0.1,
                                                    y: stackIndex * 20,
                                                    z: -stackIndex * 100,
                                                    opacity: 0,
                                                    rotateX: -20
                                                }}
                                                animate={{
                                                    scale: 1 - stackIndex * 0.08,
                                                    y: stackIndex * 25,
                                                    z: -stackIndex * 150,
                                                    rotateX: stackIndex * -10,
                                                    opacity: 1 - stackIndex * 0.25,
                                                    x: 0,
                                                    rotate: 0,
                                                }}
                                                exit={{
                                                    x: isTop ? exitDirection : 0,
                                                    opacity: 0,
                                                    scale: 0.8,
                                                    rotate: isTop ? (exitDirection > 0 ? 45 : -45) : 0,
                                                    transition: { duration: 0.4, ease: "circOut" }
                                                }}
                                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                                drag={isTop ? "x" : false}
                                                dragConstraints={{ left: 0, right: 0 }}
                                                onDragEnd={(_, info) => {
                                                    if (isTop) {
                                                        if (info.offset.x > 100) {
                                                            handlePrev();
                                                        }
                                                        else if (info.offset.x < -100) {
                                                            handleNext();
                                                        }
                                                    }
                                                }}
                                                className="absolute inset-0"
                                            >
                                                <motion.img
                                                    layoutId={isTop ? "player-album-art" : undefined}
                                                    src={getSongImage(song)}
                                                    alt=""
                                                    className="w-full h-full object-cover rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Song Info with LayoutID */}
                            <div
                                className="w-full text-left mb-8 flex justify-between items-end lg:max-w-[420px] z-10"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <motion.h2
                                        layoutId="player-song-name"
                                        className="text-2xl lg:text-4xl font-black mb-1 truncate"
                                    >
                                        {decodeHtmlEntities(currentSong.name)}
                                    </motion.h2>
                                    <motion.p
                                        layoutId="player-song-artist"
                                        className="text-lg lg:text-xl text-primary font-bold opacity-90 truncate"
                                    >
                                        {decodeHtmlEntities(currentSong.primaryArtists)}
                                    </motion.p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => dispatch(toggleFavoriteCloud(currentSong!) as any)}
                                        className="p-2 hover:scale-110 transition-transform"
                                    >
                                        {isFavorite ? <IoHeart className="text-primary" size={32} /> : <IoHeartOutline size={32} />}
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full mb-8 lg:max-w-[420px] z-10">
                                <motion.input
                                    whileHover={{ scaleY: 1.5 }}
                                    type="range"
                                    min={0}
                                    max={100}
                                    step="0.1"
                                    value={progress}
                                    onChange={handleProgressChange}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary mb-2 transition-all duration-300"
                                    style={{
                                        background: `linear-gradient(to right, ${theme.accentColor} 0%, ${theme.accentColor} ${progress}%, rgba(255,255,255,0.1) ${progress}%, rgba(255,255,255,0.1) 100%)`
                                    }}
                                />
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 tabular-nums">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="w-full flex items-center justify-between mb-6 lg:mb-10 lg:max-w-[420px] z-10">
                                <button
                                    className="p-2"
                                >
                                    <PiShuffleBold className="text-gray-500 text-xl" />
                                </button>
                                <div className="flex items-center gap-6">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handlePrev}
                                        className="p-2"
                                    >
                                        <IoMdSkipBackward size={36} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handlePlayPause}
                                        className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-black shadow-xl"
                                    >
                                        {isPlaying ? <FaPause size={28} /> : <FaPlay size={28} className="ml-1" />}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleNext}
                                        className="p-2"
                                    >
                                        <IoMdSkipForward size={36} />
                                    </motion.button>
                                </div>
                                <button
                                    className="p-2"
                                >
                                    <BiRepeat className="text-gray-500 text-xl" />
                                </button>
                            </div>

                            {/* Mobile Secondary Actions (Bottom of Player View) */}
                            <div className="w-full flex justify-around items-center mb-8 lg:hidden z-10">
                                <button
                                    onClick={() => dispatch(setEqualizerOpen(true))}
                                    className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full border border-white/5">
                                        <MdOutlineGraphicEq size={22} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Equalizer</span>
                                </button>
                                <button
                                    onClick={() => dispatch(openPlaylistModal(currentSong!))}
                                    className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full border border-white/5">
                                        <IoAddCircleOutline size={22} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Add to Playlist</span>
                                </button>
                                <button
                                    onClick={() => {
                                        // Simple share
                                        if (navigator.share) {
                                            navigator.share({
                                                title: currentSong.name,
                                                text: `Listening to ${currentSong.name} by ${currentSong.primaryArtists}`,
                                                url: window.location.origin
                                            });
                                        }
                                    }}
                                    className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full border border-white/5">
                                        <IoEllipsisHorizontal size={22} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Details (Lyrics, Queue, Discovery) */}
                        <div className={`w-full lg:w-[55%] flex flex-col overflow-y-auto custom-scrollbar px-6 py-4 lg:p-12 lg:bg-black/20 lg:backdrop-blur-3xl transition-all duration-500 ${activeSection === 'player' ? 'hidden lg:flex' : 'flex'}`}>
                            {/* Desktop Exclusive Navigation */}
                            <div className="hidden lg:flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
                                {[
                                    { id: 'player', label: 'Discovery', icon: <MdApps size={20} /> },
                                    { id: 'lyrics', label: 'Lyrics', icon: <MdOutlineLyrics size={20} /> },
                                    { id: 'queue', label: 'Queue', icon: <HiQueueList size={20} /> }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveSection(tab.id as any)}
                                        data-testid={`desktop-tab-${tab.id}`}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${(activeSection === tab.id || (tab.id === 'player' && activeSection === 'discovery')) ? 'bg-primary text-white scale-105 shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                                <div className="flex-1" />
                                <button
                                    onClick={() => dispatch(setEqualizerOpen(true))}
                                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-gray-400"
                                    title="Equalizer"
                                >
                                    <MdOutlineGraphicEq size={24} />
                                </button>
                                <button
                                    onClick={() => dispatch(openPlaylistModal(currentSong!))}
                                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-gray-400"
                                    title="Add to Playlist"
                                >
                                    <IoAddCircleOutline size={24} />
                                </button>
                            </div>

                        {/* Expandable Sections (Lyrics/Queue) */}
                        <AnimatePresence mode="wait">
                            {activeSection === 'lyrics' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-0 lg:px-0 pb-20"
                                >
                                    <div className="bg-white/5 rounded-3xl p-6 lg:p-8 backdrop-blur-md border border-white/10">
                                        <Lyrics
                                            isOpen={true}
                                            onClose={() => setActiveSection('player')}
                                            songId={currentSong.id}
                                            songName={currentSong.name}
                                            artistName={currentSong.primaryArtists}
                                            onSeek={handleSeek}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'queue' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-0 lg:px-0 pb-20"
                                >
                                    <div className="bg-white/5 rounded-3xl overflow-hidden backdrop-blur-md border border-white/10">
                                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                            <h3 className="font-bold">Next In Queue</h3>
                                            <span className="text-xs text-gray-400">{songs.length} tracks</span>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto p-2">
                                            {songs.map((song, i) => (
                                                <div
                                                    key={song.id + i}
                                                    onClick={() => dispatch(playMusic(song))}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${song.id === currentSong.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/5'}`}
                                                >
                                                    <img src={Array.isArray(song.image) ? song.image[0].url : song.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold truncate">{decodeHtmlEntities(song.name)}</p>
                                                        <p className="text-xs opacity-60 truncate">{decodeHtmlEntities(song.primaryArtists)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Recommendations Section */}
                        {(activeSection === 'player' || activeSection === 'discovery') && recommendations.length > 0 && (
                            <div className="px-0 lg:px-0 pb-20">
                                <h3 className="text-lg font-black mb-4 lg:text-xl">You might also like</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {recommendations.slice(0, 5).map(song => (
                                        <div
                                            key={song.id}
                                            onClick={() => dispatch(playMusic(song))}
                                            className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                                        >
                                            <img src={Array.isArray(song.image) ? song.image[0].url : song.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold truncate">{decodeHtmlEntities(song.name)}</p>
                                                <p className="text-xs text-gray-400 truncate">{decodeHtmlEntities(song.primaryArtists)}</p>
                                            </div>
                                            <button className="p-2 bg-primary/10 text-primary rounded-full">
                                                <FaPlay size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Song Details Section */}
                        {(activeSection === 'player' || activeSection === 'discovery') && (
                            <div className="px-0 lg:px-0 pb-32">
                                <h3 className="text-lg font-black mb-4 lg:text-xl">About this track</h3>
                                <div className="bg-white/5 rounded-3xl p-6 lg:p-8 border border-white/5 space-y-4 lg:space-y-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm lg:text-base">Album</span>
                                        <span className="text-sm lg:text-base font-bold text-right ml-4">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || 'Single')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm lg:text-base">Artists</span>
                                        <span className="text-sm lg:text-base font-bold text-right ml-4">{decodeHtmlEntities(currentSong.primaryArtists)}</span>
                                    </div>
                                    {currentSong.year && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm lg:text-base">Release Year</span>
                                            <span className="text-sm lg:text-base font-bold">{currentSong.year}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm lg:text-base">Duration</span>
                                        <span className="text-sm lg:text-base font-bold">{formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Overflow Visualizer Fixed to Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 z-0 pointer-events-none opacity-40">
                        <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileNowPlaying;
