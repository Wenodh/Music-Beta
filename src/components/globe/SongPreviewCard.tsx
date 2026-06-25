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
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-20"
        >
            <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl p-4">
                {/* Background glow based on image? Simulating with accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />

                <div className="flex gap-4 relative z-10">
                    <div className="relative group w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                        <img
                            src={imageUrl}
                            alt={song.name || song.title}
                            className="w-full h-full object-cover rounded-2xl shadow-lg"
                        />
                        <button
                            onClick={handlePlay}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl text-white"
                        >
                            {isCurrentSong && isPlaying ? <IoPause size={40} /> : <IoPlay size={40} />}
                        </button>
                    </div>

                    <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                            <div className="flex justify-between items-start gap-2">
                                <h3 className="text-white font-bold text-lg sm:text-xl truncate leading-tight">
                                    {decodeHtmlEntities(song.name || song.title || '')}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-white/60 hover:text-white transition-colors"
                                >
                                    <IoClose size={24} />
                                </button>
                            </div>
                            <p className="text-white/60 text-sm truncate">
                                {decodeHtmlEntities(song.primaryArtists || '')}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                            <button
                                onClick={handlePlay}
                                className="flex-1 bg-white text-black py-2 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                {isCurrentSong && isPlaying ? <><IoPause /> Pause</> : <><IoPlay /> Play Now</>}
                            </button>

                            <button
                                onClick={handleToggleFavorite}
                                className={`p-2.5 rounded-xl border border-white/20 backdrop-blur-md transition-all active:scale-95 ${isFavorite ? 'text-primary bg-primary/10' : 'text-white'}`}
                            >
                                {isFavorite ? <IoHeart size={20} /> : <IoHeartOutline size={20} />}
                            </button>

                            <button
                                onClick={handleAddToPlaylist}
                                className="p-2.5 rounded-xl border border-white/20 backdrop-blur-md text-white transition-all active:scale-95"
                            >
                                <IoAdd size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SongPreviewCard;
