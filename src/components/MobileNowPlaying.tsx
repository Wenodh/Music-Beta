import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoChevronDown, IoHeartOutline, IoHeart, IoAddCircleOutline, IoEllipsisHorizontal } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { BiRepeat } from 'react-icons/bi';
import { PiShuffleBold } from 'react-icons/pi';
import { MdOutlineGraphicEq } from 'react-icons/md';
import { HiQueueList } from 'react-icons/hi2';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { playMusic, nextSong as nextSongAction, prevSong as prevSongAction } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen } from '../features/ui/uiSlice';
import Lyrics from './Lyrics';

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
}) => {
    const dispatch = useAppDispatch();
    const { currentSong, isPlaying, currentTime, songs, isQueueOpen: reduxQueueOpen, recommendations } = useAppSelector(state => state.musicPlayer);
    const { favorites } = useAppSelector(state => state.library);
    const { theme, isLyricsOpen: reduxLyricsOpen } = useAppSelector(state => state.ui);
    const [activeSection, setActiveSection] = useState<'player' | 'lyrics' | 'queue'>('player');

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
                        <div className="w-10" />
                    </div>

                    {/* Integrated Main Content Area */}
                    <div className="relative z-10 flex-1 flex flex-col pointer-events-auto overflow-hidden">

                        <AnimatePresence mode="wait">
                            {activeSection === 'player' ? (
                                <motion.div
                                    key="player-view"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex-1 flex flex-col items-center justify-center px-8 py-4 overflow-y-auto custom-scrollbar no-scrollbar"
                                >
                                    {/* Large Album Art */}
                                    <div className="relative w-full aspect-square max-w-[320px] mb-8">
                                        <motion.img
                                            layoutId="player-album-art"
                                            src={imageUrl}
                                            alt=""
                                            className="w-full h-full object-cover rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
                                        />
                                    </div>

                                    {/* Large Song Info */}
                                    <div className="w-full text-left mb-6 flex justify-between items-end">
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
                                        <button
                                            onClick={() => dispatch(toggleFavoriteCloud(currentSong!) as any)}
                                            className="p-2"
                                        >
                                            {isFavorite ? <IoHeart className="text-primary" size={28} /> : <IoHeartOutline size={28} />}
                                        </button>
                                    </div>

                                    {/* Basic track info/stats */}
                                    <div className="w-full bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Album</p>
                                        <p className="text-sm font-bold truncate">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || 'Single')}</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="content-view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 flex flex-col overflow-hidden"
                                >
                                    {/* Compact Header Info */}
                                    <div className="px-6 py-4 flex items-center gap-4 border-b border-white/5">
                                        <div className="relative w-14 h-14 shrink-0">
                                            <motion.img
                                                layoutId="player-album-art"
                                                src={imageUrl}
                                                alt=""
                                                className="w-full h-full object-cover rounded-lg shadow-lg"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <motion.h2
                                                layoutId="player-song-name"
                                                className="text-base font-black truncate"
                                            >
                                                {decodeHtmlEntities(currentSong.name)}
                                            </motion.h2>
                                            <motion.p
                                                layoutId="player-song-artist"
                                                className="text-xs text-primary font-bold truncate"
                                            >
                                                {decodeHtmlEntities(currentSong.primaryArtists)}
                                            </motion.p>
                                        </div>
                                        <button onClick={() => setActiveSection('player')} className="text-[10px] font-bold text-primary border border-primary/30 px-2 py-1 rounded-full">Player</button>
                                    </div>

                                    {/* Integration Area (Lyrics or Queue) */}
                                    <div className="flex-1 min-h-0 px-4 py-2">
                                        <div className="h-full bg-white/5 rounded-3xl overflow-hidden backdrop-blur-md border border-white/10 relative">
                                            {activeSection === 'lyrics' && (
                                                <Lyrics
                                                    isOpen={true}
                                                    onClose={() => setActiveSection('player')}
                                                    songId={currentSong.id}
                                                    songName={currentSong.name}
                                                    artistName={currentSong.primaryArtists}
                                                    onSeek={handleSeek}
                                                />
                                            )}
                                            {activeSection === 'queue' && (
                                                <div className="h-full flex flex-col">
                                                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                                        <h3 className="font-bold">Next In Queue</h3>
                                                        <span className="text-xs text-gray-400">{songs.length} tracks</span>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar no-scrollbar">
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
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Integrated Controls & Progress - Fixed at bottom */}
                        <div className="px-8 pt-4 pb-12">
                            {/* Progress Bar */}
                            <div className="w-full mb-6">
                                <motion.input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step="0.1"
                                    value={progress}
                                    onChange={handleProgressChange}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary mb-2"
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
                            <div className="w-full flex items-center justify-between mb-8">
                                <button className="p-2">
                                    <PiShuffleBold className="text-gray-500 text-xl" />
                                </button>
                                <div className="flex items-center gap-8">
                                    <button onClick={() => dispatch(prevSongAction())} className="p-2">
                                        <IoMdSkipBackward size={32} />
                                    </button>
                                    <button
                                        onClick={handlePlayPause}
                                        className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black shadow-xl"
                                    >
                                        {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} className="ml-1" />}
                                    </button>
                                    <button onClick={() => dispatch(nextSongAction())} className="p-2">
                                        <IoMdSkipForward size={32} />
                                    </button>
                                </div>
                                <button className="p-2">
                                    <BiRepeat className="text-gray-500 text-xl" />
                                </button>
                            </div>

                            {/* Secondary Actions */}
                            <div className="w-full flex justify-around items-center">
                                <button
                                    onClick={() => setActiveSection(activeSection === 'lyrics' ? 'player' : 'lyrics')}
                                    className={`flex flex-col items-center gap-1 transition-colors ${activeSection === 'lyrics' ? 'text-primary' : 'text-gray-400'}`}
                                >
                                    <MdOutlineLyrics size={20} />
                                    <span className="text-[10px] font-bold uppercase">Lyrics</span>
                                </button>
                                <button
                                    onClick={() => dispatch(setEqualizerOpen(true))}
                                    className="flex flex-col items-center gap-1 text-gray-400"
                                >
                                    <MdOutlineGraphicEq size={20} />
                                    <span className="text-[10px] font-bold uppercase">EQ</span>
                                </button>
                                <button
                                    onClick={() => dispatch(openPlaylistModal(currentSong!))}
                                    className="flex flex-col items-center gap-1 text-gray-400"
                                >
                                    <IoAddCircleOutline size={20} />
                                    <span className="text-[10px] font-bold uppercase">Add</span>
                                </button>
                                <button
                                    onClick={() => setActiveSection(activeSection === 'queue' ? 'player' : 'queue')}
                                    className={`flex flex-col items-center gap-1 transition-colors ${activeSection === 'queue' ? 'text-primary' : 'text-gray-400'}`}
                                >
                                    <HiQueueList size={20} />
                                    <span className="text-[10px] font-bold uppercase">Queue</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileNowPlaying;
