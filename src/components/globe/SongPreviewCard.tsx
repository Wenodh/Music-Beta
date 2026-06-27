import React from 'react';
import { motion } from 'framer-motion';
import { IoClose, IoPlay, IoPause, IoHeart, IoHeartOutline, IoAdd } from 'react-icons/io5';
import { Song } from '../../types/music';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { playMusic } from '../../features/musicplayer/musicPlayerSlice';
import { toggleFavorite } from '../../features/library/librarySlice';
import { openPlaylistModal } from '../../features/ui/uiSlice';
import { decodeHtmlEntities } from '../../utils/decodeHtml';

interface SongPreviewCardProps {
    song: Song;
    onClose: () => void;
}

const SongPreviewCard: React.FC<SongPreviewCardProps> = ({ song, onClose }) => {
    const dispatch = useAppDispatch();
    const { currentSong, isPlaying } = useAppSelector(state => state.musicPlayer);
    const { favorites } = useAppSelector(state => state.library);
    const isCurrentSong = currentSong?.id === song.id;
    const isFavorite = favorites.some(f => f.id === song.id);

    const imageUrl = Array.isArray(song.image)
        ? song.image[song.image.length - 1]?.url
        : song.image;

    const handlePlay = () => {
        dispatch(playMusic(song));
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(toggleFavorite(song));
    };

    const handleAddToPlaylist = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(openPlaylistModal(song));
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-40%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-40%' }}
            className="absolute top-1/2 left-1/2 w-[85%] max-w-[340px] z-20"
        >
            <div className="relative overflow-hidden rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-5">
                {/* Background glow based on image? Simulating with accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }} />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 blur-[60px] rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }} />

                <div className="flex flex-col items-center text-center gap-4 relative z-10">
                    <div className="relative group w-32 h-32 flex-shrink-0">
                        <img
                            src={imageUrl}
                            alt={song.name || song.title}
                            className="w-full h-full object-cover rounded-full shadow-2xl border-2 border-white/20"
                        />
                        <button
                            onClick={handlePlay}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white"
                        >
                            {isCurrentSong && isPlaying ? <IoPause size={40} /> : <IoPlay size={40} />}
                        </button>
                    </div>

                    <div className="flex flex-col w-full min-w-0">
                        <div className="mb-4">
                            <h3 className="text-white font-bold text-xl truncate leading-tight">
                                {decodeHtmlEntities(song.name || song.title || '')}
                            </h3>
                            <p className="text-white/60 text-sm truncate">
                                {decodeHtmlEntities(song.primaryArtists || '')}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePlay}
                                className="flex-1 bg-white text-black py-2.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                {isCurrentSong && isPlaying ? <IoPause size={20} /> : <IoPlay size={20} />}
                                {isCurrentSong && isPlaying ? 'Pause' : 'Play'}
                            </button>

                            <button
                                onClick={handleToggleFavorite}
                                className={`p-3 rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-95 ${isFavorite ? 'text-primary' : 'text-white bg-white/5'}`}
                                style={isFavorite ? { backgroundColor: 'rgba(var(--accent-rgb), 0.1)' } : {}}
                            >
                                {isFavorite ? <IoHeart size={20} /> : <IoHeartOutline size={20} />}
                            </button>

                            <button
                                onClick={handleAddToPlaylist}
                                className="p-3 rounded-full border border-white/10 backdrop-blur-md text-white bg-white/5 transition-all active:scale-95"
                            >
                                <IoAdd size={20} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute -top-2 -right-2 p-2 bg-white/10 rounded-full text-white/80 hover:text-white backdrop-blur-xl border border-white/10 transition-colors shadow-lg"
                    >
                        <IoClose size={20} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SongPreviewCard;
