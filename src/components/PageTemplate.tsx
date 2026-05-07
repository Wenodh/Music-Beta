import React, { useState, useEffect } from 'react';
import useFetchDetails from '../hooks/useFetchDetails';
import ImageComponent from './ImageComponent';
import FlexLayout from './FlexLayout';
import SongsList from './SongsList';
import Slider from './Slider';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSongs, playMusic } from '../features/musicplayer/musicPlayerSlice';
import { toggleFavorite } from '../features/library/librarySlice';
import { openPlaylistModal, showToast } from '../features/ui/uiSlice';
import { IoGridOutline, IoListOutline, IoFilterOutline, IoPlay, IoHeart, IoHeartOutline, IoAdd } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { Song } from '../types/music';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface PageTemplateProps {
    apiUrl: string;
    getImageUrl: (data: any) => string;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ apiUrl, getImageUrl }) => {
    const { details, loading, error, image } = useFetchDetails(apiUrl, getImageUrl);
    const dispatch = useAppDispatch();
    const { favorites } = useAppSelector((state) => state.library);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<'default' | 'name' | 'artist' | 'duration'>('default');

    const rawSongs = (details as any)?.songs || (details as any)?.topSongs || [];

    useEffect(() => {
        if (rawSongs.length > 0) {
            dispatch(setSongs(rawSongs));
        }
    }, [rawSongs, dispatch]);

    const songs = [...rawSongs].sort((a: any, b: any) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'artist') return a.primaryArtists.localeCompare(b.primaryArtists);
        if (sortBy === 'duration') return Number(b.duration) - Number(a.duration);
        return 0;
    });

    const handlePlayAll = () => {
        if (songs.length > 0) {
            dispatch(playMusic(songs[0]));
        }
    };

    const handleFavorite = (e: React.MouseEvent, song: Song) => {
        e.stopPropagation();
        const isFavorite = favorites.some(s => s.id === song.id);
        dispatch(toggleFavorite(song));
        dispatch(showToast({
            message: isFavorite ? 'Removed from favorites' : 'Added to favorites'
        }));
    };

    const handleAddToPlaylist = (e: React.MouseEvent, song: Song) => {
        e.stopPropagation();
        dispatch(openPlaylistModal(song));
    };

    if (loading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="p-10 text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
                Retry
            </button>
        </div>
    );

    return (
        <div className="p-5 pb-32 max-w-7xl mx-auto">
            <FlexLayout>
                <div className="flex flex-col items-center lg:items-start lg:sticky lg:top-24 h-fit">
                    <div className="relative group cursor-pointer" onClick={handlePlayAll}>
                        <ImageComponent src={image} alt={details?.name || 'Album/Artist'} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                                <span className="text-3xl">▶</span>
                            </button>
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-4 sm:mt-6 text-center lg:text-left leading-tight line-clamp-2">{decodeHtmlEntities(details?.name || '')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-center lg:text-left font-medium text-sm sm:text-base line-clamp-2 px-4 lg:px-0">
                        {decodeHtmlEntities(Array.isArray((details as any)?.artists)
                            ? (details as any).artists.map((a: any) => a.name).join(', ')
                            : (details as any)?.primaryArtists ||
                              ((details as any)?.artists && typeof (details as any).artists === 'object'
                                ? (details as any).artists.primary?.map((a: any) => a.name).join(', ')
                                : (details as any)?.artists) || '')}
                    </p>
                    {(details as any)?.songCount && (
                        <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{(details as any).songCount} Songs</p>
                    )}
                </div>

                <div className="flex-1 w-full lg:pl-10 mt-6 lg:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                            Songs
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{songs.length}</span>
                        </h2>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-500' : 'text-gray-500'}`}
                                >
                                    <IoGridOutline size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-500' : 'text-gray-500'}`}
                                >
                                    <IoListOutline size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <IoFilterOutline />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium outline-none"
                                >
                                    <option value="default">Default</option>
                                    <option value="name">A-Z (Name)</option>
                                    <option value="artist">A-Z (Artist)</option>
                                    <option value="duration">Duration</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                        : "flex flex-col gap-1"
                    }>
                        <AnimatePresence mode="popLayout">
                            {songs.map((song: Song) => (
                                viewMode === 'list' ? (
                                    <SongsList
                                        key={song.id}
                                        name={song.name}
                                        artists={song.primaryArtists}
                                        duration={song.duration}
                                        downloadUrl={song.downloadUrl}
                                        image={song.image}
                                        id={song.id}
                                        album={song.album || details}
                                    />
                                ) : (
                                    <motion.div
                                        key={song.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ y: -5 }}
                                        className="group cursor-pointer bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-red-500/30 transition-all relative"
                                        onClick={() => dispatch(playMusic(song))}
                                    >
                                        <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-md">
                                            <img
                                                src={Array.isArray(song.image) ? song.image[song.image.length - 1].url : song.image}
                                                alt={song.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleFavorite(e, song)}
                                                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                                    title={favorites.some(s => s.id === song.id) ? "Remove from Favorites" : "Add to Favorites"}
                                                >
                                                    {favorites.some(s => s.id === song.id) ? <IoHeart /> : <IoHeartOutline />}
                                                </motion.button>
                                                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg">
                                                    <IoPlay />
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleAddToPlaylist(e, song)}
                                                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                                    title="Add to Playlist"
                                                >
                                                    <IoAdd size={20} />
                                                </motion.button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold truncate group-hover:text-red-500 transition-colors">{decodeHtmlEntities(song.name)}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">{decodeHtmlEntities(song.primaryArtists)}</p>
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </FlexLayout>

            {(details as any)?.topAlbums && (
                <div className="mt-20">
                    <Slider data={(details as any).topAlbums} title="Top Albums" />
                </div>
            )}
        </div>
    );
};

export default PageTemplate;
