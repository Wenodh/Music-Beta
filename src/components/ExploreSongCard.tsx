import React from 'react';
import { motion } from 'framer-motion';
import { IoPlay } from 'react-icons/io5';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { showToast } from '../features/ui/uiSlice';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { Song } from '../types/music';

interface ExploreSongCardProps {
    song: Song;
    index: number;
}

// Randomize height for masonry effect (premium look)
const aspectRatios = [
    'aspect-[3/4]',
    'aspect-[2/3]',
    'aspect-[4/5]',
    'aspect-[1/1]',
    'aspect-[3/5]',
    'aspect-[4/3]',
    'aspect-[9/16]'
];

const ExploreSongCard: React.FC<ExploreSongCardProps> = ({ song, index }) => {
    const dispatch = useAppDispatch();

    // Use a more complex sequence to avoid repetitive patterns in columns
    const aspectClass = aspectRatios[(index * 3 + index % 7) % aspectRatios.length];

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (song.type === 'radio' && !navigator.onLine) {
            dispatch(showToast({ message: 'Internet connection required for Live Radio', type: 'error' }));
            return;
        }
        dispatch(playMusic({ ...song, forcePlay: true }));
    };

    const imageUrl = Array.isArray(song.image)
        ? song.image[song.image.length - 1]?.url
        : song.image;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.4,
                delay: Math.min((index % 20) * 0.03, 0.5),
                ease: [0.23, 1, 0.32, 1]
            }}
            className="relative group cursor-pointer"
            onClick={handlePlay}
        >
            <div className={`relative w-full ${aspectClass} overflow-hidden rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-neutral-900 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/10`}>
                <img
                    src={imageUrl}
                    alt={song.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Elegant Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Play Button Center */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white shadow-2xl">
                        <IoPlay size={20} className="ml-1 sm:text-2xl" />
                    </div>
                </div>

                {/* Info Overlay (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-white text-[11px] sm:text-sm font-semibold truncate leading-tight mb-0.5">
                        {decodeHtmlEntities(song.name)}
                    </h3>
                    <p className="text-white/80 text-[10px] sm:text-xs truncate font-medium">
                        {decodeHtmlEntities(song.primaryArtists)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default ExploreSongCard;
