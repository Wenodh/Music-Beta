import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavorite } from '../features/library/librarySlice';
import { openPlaylistModal, showToast } from '../features/ui/uiSlice';
import { LuHardDriveDownload } from 'react-icons/lu';
import { useState } from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { motion } from 'framer-motion';
import { IoAdd, IoHeart, IoHeartOutline } from 'react-icons/io5';
import { Song } from '../types/music';

interface SongsListProps {
    name: string;
    artists: string;
    duration: string | number;
    downloadUrl: any;
    image: any;
    id: string;
    album: any;
}

const SongsList: React.FC<SongsListProps> = ({
    name,
    artists,
    duration,
    downloadUrl,
    image,
    id,
    album,
}) => {
    const dispatch = useAppDispatch();
    const { currentSong } = useAppSelector((state) => state.musicPlayer);
    const { favorites } = useAppSelector((state) => state.library);
    const [isDownloading, setIsDownloading] = useState(false);

    const isFavorite = favorites.some(s => s.id === id);

    const formatDuration = (sec: string | number) => {
        const minutes = Math.floor(Number(sec) / 60);
        const seconds = Math.floor(Number(sec) % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const songData: Song = {
            id, name, primaryArtists: parsedArtists, duration,
            image, downloadUrl, album
        };
        dispatch(toggleFavorite(songData));
        dispatch(showToast({
            message: isFavorite ? 'Removed from favorites' : 'Added to favorites'
        }));
    };

    const handleAddToPlaylist = (e: React.MouseEvent) => {
        e.stopPropagation();
        const songData: Song = {
            id, name, primaryArtists: parsedArtists, duration,
            image, downloadUrl, album
        };
        dispatch(openPlaylistModal(songData));
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = Array.isArray(downloadUrl) ? downloadUrl[downloadUrl.length - 1]?.url : downloadUrl;
        if (!url) {
            alert("Download URL not available for this song.");
            return;
        }

        setIsDownloading(true);
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${name}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const isCurrent = currentSong?.id === id;

    const parsedArtists = typeof artists === 'object'
        ? (artists as any).primary?.map((a: any) => a.name).join(', ') || (artists as any).all?.map((a: any) => a.name).join(', ')
        : artists;

    return (
        <motion.div
            whileHover={{ x: 4, backgroundColor: "rgba(239, 68, 68, 0.05)" }}
            onClick={() =>
                dispatch(
                    playMusic({
                        name,
                        primaryArtists: parsedArtists,
                        duration,
                        music: downloadUrl,
                        image,
                        id,
                        album,
                    })
                )
            }
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent ${
                isCurrent
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/50 text-red-600'
                    : 'hover:border-gray-200 dark:hover:border-gray-800'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className="relative group/song">
                    <img
                        src={Array.isArray(image) ? image[0]?.url : image}
                        alt={name}
                        className="w-12 h-12 rounded-lg object-cover shadow-sm"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/song:opacity-100 transition-opacity rounded-lg">
                        <span className="text-white text-xs">▶</span>
                    </div>
                </div>
                <div>
                    <p className="font-semibold text-xs sm:text-sm truncate max-w-[180px] md:max-w-md">
                        {name}
                    </p>
                    <p className="text-[9px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[180px] md:max-w-md">
                        {parsedArtists}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
                <span className="text-[10px] sm:text-xs font-mono text-gray-400 mr-1 sm:mr-2">
                    {formatDuration(duration)}
                </span>

                <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleFavorite}
                    className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                    {isFavorite ? <IoHeart size={18} /> : <IoHeartOutline size={18} />}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToPlaylist}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title="Add to Playlist"
                >
                    <IoAdd size={20} />
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDownload}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    aria-label="Download song"
                >
                    {isDownloading ? (
                        <AiOutlineLoading3Quarters className="animate-spin" />
                    ) : (
                        <LuHardDriveDownload size={18} />
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
};

export default SongsList;
