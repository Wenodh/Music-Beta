import React from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { Song } from '../types/music';
import { playMusic, pauseMusic, nextSong, prevSong } from '../features/musicplayer/musicPlayerSlice';
import { IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward, IoClose } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface MiniPlayerProps {
    onClose: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClose }) => {
    const { currentSong, isPlaying } = useAppSelector(state => state.musicPlayer);
    const dispatch = useAppDispatch();

    if (!currentSong) return null;

    const imageUrl = Array.isArray(currentSong.image)
        ? (currentSong.image[1]?.url || currentSong.image[0]?.url)
        : currentSong.image;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-28 right-6 w-72 glass-panel shadow-2xl rounded-3xl overflow-hidden border border-white/20 z-[220] hidden lg:block glow-box"
        >
            <div className="relative aspect-square group overflow-hidden">
                <img src={imageUrl} alt={currentSong.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-5">
                    <button
                        onClick={() => dispatch(prevSong())}
                        className="text-white hover:scale-110 active:scale-90 transition-all p-2 rounded-full bg-white/10 backdrop-blur-md"
                    >
                        <IoPlaySkipBack size={22} />
                    </button>
                    <button
                        onClick={() => isPlaying ? dispatch(pauseMusic()) : dispatch(playMusic(currentSong))}
                        className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl shadow-primary/30"
                    >
                        {isPlaying ? <IoPause size={24} /> : <IoPlay size={24} className="ml-1" />}
                    </button>
                    <button
                        onClick={() => dispatch(nextSong())}
                        className="text-white hover:scale-110 active:scale-90 transition-all p-2 rounded-full bg-white/10 backdrop-blur-md"
                    >
                        <IoPlaySkipForward size={22} />
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                    <IoClose size={18} />
                </button>
            </div>
            <div className="p-4 bg-slate-900/90 backdrop-blur-2xl">
                <p className="font-bold text-sm truncate text-white">{decodeHtmlEntities(currentSong.name)}</p>
                <p className="text-xs text-primary/90 font-medium truncate mt-0.5">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
            </div>
        </motion.div>
    );
};

export default MiniPlayer;
