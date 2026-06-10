import React from 'react';
import { motion } from 'framer-motion';
import { IoPlay } from 'react-icons/io5';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { Song } from '../types/music';

interface ExploreSongCardProps {
    song: Song;
    index: number;
}

const ExploreSongCard: React.FC<ExploreSongCardProps> = ({ song, index }) => {
    const dispatch = useAppDispatch();

    // Randomize height for masonry effect (premium look)
    // We can use a few pre-defined aspect ratios or extra padding
    const heights = ['aspect-[3/4]', 'aspect-[1/1]', 'aspect-[4/5]', 'aspect-[2/3]'];
    const aspectClass = heights[index % heights.length];

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(playMusic({ ...song, forcePlay: true }));
    };

    const imageUrl = Array.isArray(song.image)
        ? song.image[song.image.length - 1]?.url
        : song.image;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index % 10) * 0.05 }}
            className="relative mb-4 break-inside-avoid group cursor-pointer"
            onClick={handlePlay}
        >
            <div className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-lg group-hover:shadow-primary/20 transition-all duration-300`}>
                <img
                    src={imageUrl}
                    alt={song.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-xl"
                    >
                        <IoPlay size={24} className="ml-1" />
                    </motion.div>
                </div>

                {/* Info Overlay (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <h3 className="text-white text-sm font-bold truncate">
                        {decodeHtmlEntities(song.name)}
                    </h3>
                    <p className="text-white/70 text-xs truncate">
                        {decodeHtmlEntities(song.primaryArtists)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default ExploreSongCard;
