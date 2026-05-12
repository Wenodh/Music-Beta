import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoClose, IoChevronDown, IoEllipsisHorizontal } from 'react-icons/io5';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { BiRepeat } from 'react-icons/bi';
import { PiShuffleBold } from 'react-icons/pi';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import Visualizer from './Visualizer';

interface MobileNowPlayingProps {
    isOpen: boolean;
    onClose: () => void;
    prevSong: () => void;
    nextSong: () => void;
    handlePlayPause: () => void;
    imageUrl: string;
    audioRefs: React.RefObject<HTMLAudioElement>[];
}

const MobileNowPlaying: React.FC<MobileNowPlayingProps> = ({
    isOpen,
    onClose,
    prevSong,
    nextSong,
    handlePlayPause,
    imageUrl,
    audioRefs
}) => {
    const { currentSong, isPlaying, currentTime } = useAppSelector(state => state.musicPlayer);
    const dispatch = useAppDispatch();

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
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed inset-0 z-[70] bg-gray-950 flex flex-col text-white md:hidden"
                >
                    {/* Background Blur */}
                    <div className="absolute inset-0 z-0">
                        <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-20 blur-3xl scale-150" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/50 to-gray-950" />
                    </div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between p-6">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <IoChevronDown size={28} />
                        </button>
                        <div className="text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Now Playing</p>
                            <p className="text-xs font-bold truncate max-w-[200px]">{decodeHtmlEntities(typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || '')}</p>
                        </div>
                        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <IoEllipsisHorizontal size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-12">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative w-full aspect-square max-w-[320px] mb-12"
                        >
                            <div className="absolute -inset-4 opacity-30">
                                <Visualizer audioRefs={audioRefs} isPlaying={isPlaying} />
                            </div>
                            <img
                                src={imageUrl}
                                alt=""
                                className="w-full h-full object-cover rounded-3xl shadow-2xl border border-white/10 relative z-10"
                            />
                        </motion.div>

                        <div className="w-full text-left mb-8">
                            <h2 className="text-2xl font-black mb-1 truncate">{decodeHtmlEntities(currentSong.name)}</h2>
                            <p className="text-lg text-primary font-bold opacity-80 truncate">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full mb-8">
                            <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-primary"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 tabular-nums">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="w-full flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <button className="p-2">
                                <PiShuffleBold className="text-gray-500 text-xl" />
                            </button>
                            <div className="flex items-center gap-8">
                                <button onClick={(e) => { e.stopPropagation(); prevSong(); }} className="p-2">
                                    <IoMdSkipBackward size={32} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                                    className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-black shadow-xl"
                                >
                                    {isPlaying ? <FaPause size={28} /> : <FaPlay size={28} className="ml-1" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); nextSong(); }} className="p-2">
                                    <IoMdSkipForward size={32} />
                                </button>
                            </div>
                            <button className="p-2">
                                <BiRepeat className="text-gray-500 text-xl" />
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="relative z-10 p-8 flex justify-around border-t border-white/5">
                         {/* Icons for lyrics, queue, timer could go here */}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileNowPlaying;
