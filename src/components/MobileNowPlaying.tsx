import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoChevronDown, IoEllipsisHorizontal, IoHeartOutline, IoHeart, IoAddCircleOutline } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { BiRepeat } from 'react-icons/bi';
import { PiShuffleBold } from 'react-icons/pi';
import { MdOutlineLyrics, MdOutlineGraphicEq, MdBarChart, MdShowChart, MdBubbleChart, MdLensBlur } from 'react-icons/md';
import { HiQueueList } from 'react-icons/hi2';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { playMusic, setQueueOpen, setCurrentTime, nextSong as nextSongAction, prevSong as prevSongAction, setVisualizerStyle } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen } from '../features/ui/uiSlice';
import Visualizer from './Visualizer';
import Lyrics from './Lyrics';
import Queue from './Queue';
import { useMotionValue, useTransform } from 'framer-motion';

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
    const [activeSection, setActiveSection] = useState<'player' | 'lyrics' | 'queue'>('player');

    // Tinder-style swipe state
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const mainCardOpacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // Background card transforms
    const bgCard1Scale = useTransform(x, [-200, 0, 200], [0.95, 0.9, 0.95]);
    const bgCard1Opacity = useTransform(x, [-200, 0, 200], [0.3, 0.1, 0.3]);
    const bgCard1Y = useTransform(x, [-200, 0, 200], [10, 20, 10]);

    const bgCard2Scale = useTransform(x, [-200, 0, 200], [1, 0.95, 1]);
    const bgCard2Opacity = useTransform(x, [-200, 0, 200], [0.8, 0.4, 0.8]);
    const bgCard2Y = useTransform(x, [-200, 0, 200], [0, 10, 0]);

    const nextImgOpacity = useTransform(x, [-200, 0, 200], [1, 1, 0]);
    const prevImgOpacity = useTransform(x, [-200, 0, 200], [0, 1, 1]);

    // Reset x position when song changes
    React.useEffect(() => {
        x.set(0);
    }, [currentSong?.id, x]);

    // Get next and previous songs for the stack
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const hasSongs = songs.length > 0;
    const nextSong = hasSongs ? songs[(currentIndex + 1) % songs.length] : null;
    const prevSong = hasSongs ? songs[(currentIndex - 1 + songs.length) % songs.length] : null;

    const getImageUrl = (song: any) => {
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
                    className="fixed inset-0 z-[220] bg-gray-950 flex flex-col text-white overflow-hidden touch-none"
                >
                    {/* Background Gradient & Blur */}
                    <div className="absolute inset-0 z-0">
                        <motion.div
                            className="absolute inset-0 opacity-40 blur-[100px] saturate-[2]"
                            style={{ backgroundColor: theme.accentColor }}
                        />
                        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-150" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-gray-950/80 to-gray-950" />

                        {/* Background Visualizer */}
                        <div className="absolute inset-0 opacity-40 pointer-events-none">
                            <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                        </div>
                    </div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between p-6">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <IoChevronDown size={28} />
                        </button>
                        <div className="text-center flex-1 px-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Now Playing</p>
                            <p className="text-xs font-bold truncate">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || '')}</p>
                        </div>
                        <div className="w-10" /> {/* Spacer to keep title centered */}
                    </div>

                    {/* Main Content Area */}
                    <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col pointer-events-auto">
                        <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
                            {/* Album Art with Tinder-style swipe */}
                            <div className="relative w-full aspect-square max-w-[340px] mb-8 group perspective-1000">
                                <div className="absolute -inset-8 opacity-50">
                                    <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                                </div>

                                {/* Background Cards (Stack) */}
                                <div className="absolute inset-0 z-0 flex items-center justify-center">
                                    {/* Second Background Card */}
                                    <motion.div
                                        style={{
                                            scale: bgCard1Scale,
                                            opacity: bgCard1Opacity,
                                            y: bgCard1Y,
                                        }}
                                        className="absolute inset-0 w-full h-full bg-white/5 rounded-3xl blur-md"
                                    />

                                    {/* Immediate Background Card */}
                                    <motion.div
                                        style={{
                                            scale: bgCard2Scale,
                                            opacity: bgCard2Opacity,
                                            y: bgCard2Y,
                                        }}
                                        className="absolute inset-0 w-full h-full"
                                    >
                                        {nextSong && (
                                            <motion.img
                                                src={getImageUrl(nextSong)}
                                                style={{ opacity: nextImgOpacity }}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover rounded-3xl opacity-40 blur-[2px]"
                                            />
                                        )}
                                        {prevSong && (
                                            <motion.img
                                                src={getImageUrl(prevSong)}
                                                style={{ opacity: prevImgOpacity }}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover rounded-3xl opacity-40 blur-[2px]"
                                            />
                                        )}
                                    </motion.div>
                                </div>

                                {/* Active Card */}
                                <motion.div
                                    style={{ x, rotate, opacity: mainCardOpacity }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(_, info) => {
                                        const swipeThreshold = 100;
                                        if (info.offset.x > swipeThreshold) {
                                            dispatch(prevSongAction());
                                        } else if (info.offset.x < -swipeThreshold) {
                                            dispatch(nextSongAction());
                                        }
                                    }}
                                    className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing"
                                >
                                    <motion.img
                                        layoutId="player-album-art"
                                        src={imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
                                    />
                                </motion.div>

                                {/* Visualizer Style Selector */}
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(['bars', 'circular', 'waveform', 'particles'] as const).map(style => {
                                        const getIcon = () => {
                                            switch (style) {
                                                case 'bars': return <MdBarChart size={18} />;
                                                case 'circular': return <MdLensBlur size={18} />;
                                                case 'waveform': return <MdShowChart size={18} />;
                                                case 'particles': return <MdBubbleChart size={18} />;
                                                default: return <MdOutlineGraphicEq size={18} />;
                                            }
                                        };
                                        return (
                                            <button
                                                key={style}
                                                onClick={() => dispatch(setVisualizerStyle(style))}
                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${visualizerStyle === style ? 'bg-primary text-white scale-110' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                title={`${style} visualizer`}
                                            >
                                                {getIcon()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Song Info with LayoutID */}
                            <div
                                className="w-full text-left mb-8 flex justify-between items-end"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <motion.h2
                                        layoutId="player-song-name"
                                        className="text-2xl md:text-3xl font-black mb-1 truncate"
                                    >
                                        {decodeHtmlEntities(currentSong.name)}
                                    </motion.h2>
                                    <motion.p
                                        layoutId="player-song-artist"
                                        className="text-lg text-primary font-bold opacity-90 truncate"
                                    >
                                        {decodeHtmlEntities(currentSong.primaryArtists)}
                                    </motion.p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => dispatch(toggleFavoriteCloud(currentSong!) as any)}
                                        className="p-2"
                                    >
                                        {isFavorite ? <IoHeart className="text-primary" size={28} /> : <IoHeartOutline size={28} />}
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full mb-8">
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
                            <div className="w-full flex items-center justify-between mb-10">
                                <button
                                    className="p-2"
                                >
                                    <PiShuffleBold className="text-gray-500 text-xl" />
                                </button>
                                <div className="flex items-center gap-6">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => dispatch(prevSongAction())}
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
                                        onClick={() => dispatch(nextSongAction())}
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

                            {/* Secondary Actions */}
                            <div className="w-full flex justify-between items-center px-4 mb-8">
                                <button
                                    onClick={() => setActiveSection(activeSection === 'lyrics' ? 'player' : 'lyrics')}
                                    className={`flex flex-col items-center gap-1 transition-colors ${activeSection === 'lyrics' ? 'text-primary' : 'text-gray-400'}`}
                                >
                                    <MdOutlineLyrics size={24} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Lyrics</span>
                                </button>
                                <button
                                    onClick={() => dispatch(setEqualizerOpen(true))}
                                    className="flex flex-col items-center gap-1 text-gray-400"
                                >
                                    <MdOutlineGraphicEq size={24} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">EQ</span>
                                </button>
                                <button
                                    onClick={() => dispatch(openPlaylistModal(currentSong!))}
                                    className="flex flex-col items-center gap-1 text-gray-400"
                                >
                                    <IoAddCircleOutline size={24} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Add</span>
                                </button>
                                <button
                                    onClick={() => setActiveSection(activeSection === 'queue' ? 'player' : 'queue')}
                                    className={`flex flex-col items-center gap-1 transition-colors ${activeSection === 'queue' ? 'text-primary' : 'text-gray-400'}`}
                                >
                                    <HiQueueList size={24} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Queue</span>
                                </button>
                            </div>
                        </div>

                        {/* Expandable Sections (Lyrics/Queue) */}
                        <AnimatePresence mode="wait">
                            {activeSection === 'lyrics' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-6 pb-20"
                                >
                                    <div className="bg-white/5 rounded-3xl p-6 backdrop-blur-md border border-white/10">
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
                                    className="px-6 pb-20"
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
                        {activeSection === 'player' && recommendations.length > 0 && (
                            <div className="px-8 pb-20">
                                <h3 className="text-lg font-black mb-4">You might also like</h3>
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
                        {activeSection === 'player' && (
                            <div className="px-8 pb-32">
                                <h3 className="text-lg font-black mb-4">About this track</h3>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Album</span>
                                        <span className="text-sm font-bold text-right ml-4">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || 'Single')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Artists</span>
                                        <span className="text-sm font-bold text-right ml-4">{decodeHtmlEntities(currentSong.primaryArtists)}</span>
                                    </div>
                                    {currentSong.year && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400 text-sm">Release Year</span>
                                            <span className="text-sm font-bold">{currentSong.year}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Duration</span>
                                        <span className="text-sm font-bold">{formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileNowPlaying;
