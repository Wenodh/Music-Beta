import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { playMusic, setSearchedSongs, removeRecentSearch, clearRecentSearches, setSearchQuery as setSearchQueryAction } from '../features/musicplayer/musicPlayerSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoTimeOutline, IoCloseOutline, IoSearchOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { Song, Album, Artist, Playlist } from '../types/music';

const SearchSection: React.FC = () => {
    const { searchedSongs, recentSearches } = useAppSelector((state) => state.musicPlayer);
    const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists' | 'playlists' | 'radio'>('songs');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Close search on navigation
    useEffect(() => {
        // Only clear if navigating away from a search-related flow
        // For now, let's keep it clearing but maybe we want to persist it on some pages
        dispatch(setSearchedSongs([]));
    }, [location.pathname, dispatch]);

    if (!searchedSongs || (Array.isArray(searchedSongs) && searchedSongs.length === 0)) {
        if (!recentSearches || recentSearches.length === 0) return null;

        return (
            <div className="px-2 sm:px-4 py-6 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-800/20">
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <IoTimeOutline size={18} /> Recent Searches
                        </h3>
                        <button
                            onClick={() => dispatch(clearRecentSearches())}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {recentSearches.map((query) => (
                            <div
                                key={query}
                                className="group flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-primary/20 transition-all cursor-pointer"
                                style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }}
                                onClick={() => {
                                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                                    if (input) {
                                        // Focus the input to let the user see the text and maybe trigger debounced search
                                        input.focus();
                                        // We need to set the value in a way that triggers React's onChange
                                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                                        nativeInputValueSetter?.call(input, query);
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                }}
                            >
                                <span className="text-sm font-medium">{query}</span>
                                <IoCloseOutline
                                    size={16}
                                    className="text-gray-400 hover:text-primary transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(removeRecentSearch(query));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Handle both cases: old state (array of songs) and new state (object with categories)
    const data = Array.isArray(searchedSongs) ? { songs: { results: searchedSongs } } : (searchedSongs || {});

    const songs = (data as any).songs?.results || [];
    const albums = (data as any).albums?.results || [];
    const artists = (data as any).artists?.results || [];
    const playlists = (data as any).playlists?.results || [];
    const radio = (data as any).radio?.results || [];

    const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0 || playlists.length > 0 || radio.length > 0;
    if (!hasResults) {
        return (
            <div className="px-2 sm:px-4 py-20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-800/20 text-center">
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                    <div className="mb-4 flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <IoSearchOutline size={40} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No results found</h3>
                    <p className="text-gray-500 dark:text-gray-400">We couldn't find anything matching your search query. Try something else!</p>
                    <button
                        onClick={() => dispatch(setSearchedSongs([]))}
                        className="mt-6 px-6 py-2 bg-primary text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                    >
                        Clear Search
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'songs', label: 'Songs', count: songs.length },
        { id: 'albums', label: 'Albums', count: albums.length },
        { id: 'artists', label: 'Artists', count: artists.length },
        { id: 'playlists', label: 'Playlists', count: playlists.length },
        { id: 'radio', label: 'Radio', count: radio.length },
    ].filter(t => t.count > 0);

    return (
        <div className="px-2 sm:px-4 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-800/20">
            <div className="max-w-7xl mx-auto px-2 sm:px-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            dispatch(setSearchedSongs([]));
                            dispatch(setSearchQueryAction(''));
                        }}
                        className="text-xs font-bold text-primary hover:bg-primary/20 px-3 py-1.5 rounded-full transition-all"
                    >
                        CLEAR
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
                    >
                        {activeTab === 'songs' && songs.map((song: Song) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={song.id}
                                onClick={() => dispatch(playMusic(song))}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={typeof song.image === 'string' ? song.image : song.image?.[2]?.url || ''}
                                        alt={song.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                            <span>▶</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(song.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">{decodeHtmlEntities(song.primaryArtists)}</p>
                            </motion.div>
                        ))}

                        {activeTab === 'albums' && albums.map((album: Album & { artist?: string }) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={album.id}
                                onClick={() => navigate(`/albums/${album.id}`)}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={typeof album.image === 'string' ? album.image : album.image?.[2]?.url || ''}
                                        alt={album.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(album.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">Album • {decodeHtmlEntities(album.artist)}</p>
                            </motion.div>
                        ))}

                        {activeTab === 'artists' && artists.map((artist: Artist & { role?: string }) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={artist.id}
                                onClick={() => navigate(`/artists/${artist.id}`)}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all flex flex-col items-center text-center"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-full w-full max-w-[120px]">
                                    <img
                                        src={typeof artist.image === 'string' ? artist.image : artist.image?.[2]?.url || ''}
                                        alt={artist.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors w-full">{decodeHtmlEntities(artist.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">{artist.role}</p>
                            </motion.div>
                        ))}

                        {activeTab === 'playlists' && playlists.map((playlist: Playlist) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={playlist.id}
                                onClick={() => navigate(`/playlists/${playlist.id}`)}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={typeof playlist.image === 'string' ? playlist.image : playlist.image?.[2]?.url || ''}
                                        alt={playlist.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(playlist.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">Playlist</p>
                            </motion.div>
                        ))}

                        {activeTab === 'radio' && radio.map((station: Song) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={station.id}
                                onClick={() => dispatch(playMusic(station))}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={typeof station.image === 'string' ? station.image : station.image?.[2]?.url || ''}
                                        alt={station.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                            <span>▶</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(station.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">{decodeHtmlEntities(station.primaryArtists)}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SearchSection;
