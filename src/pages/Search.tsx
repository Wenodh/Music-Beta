import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoSearchOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { useNavigate } from 'react-router-dom';
import { decodeHtmlEntities } from '../utils/decodeHtml';

const SearchPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { theme } = useAppSelector((state) => state.ui);
    const { searchedSongs } = useAppSelector((state) => state.musicPlayer);
    const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists' | 'playlists'>('songs');

    const data = Array.isArray(searchedSongs) ? { songs: { results: searchedSongs } } : searchedSongs;
    const songs = data?.songs?.results || [];
    const albums = data?.albums?.results || [];
    const artists = data?.artists?.results || [];
    const playlists = data?.playlists?.results || [];
    const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0 || playlists.length > 0;

    const tabs = [
        { id: 'songs', label: 'Songs', count: songs.length },
        { id: 'albums', label: 'Albums', count: albums.length },
        { id: 'artists', label: 'Artists', count: artists.length },
        { id: 'playlists', label: 'Playlists', count: playlists.length },
    ].filter(t => t.count > 0);

    return (
        <div className="pb-32 pt-4 px-2 sm:px-4">
            {!hasResults ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${theme.isOled ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-800'} text-gray-400`}
                    >
                        <IoSearchOutline size={40} />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Search Vibe On</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        Use the search bar at the top to find your favorite songs, albums, and artists.
                    </p>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-white/10">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                        >
                            {activeTab === 'songs' && songs.map((song: any) => (
                                <div
                                    key={song.id}
                                    onClick={() => dispatch(playMusic(song))}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-xl">
                                        <img
                                            src={song.image?.[2]?.url || song.image}
                                            alt={song.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                                <span>▶</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(song.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{decodeHtmlEntities(song.primaryArtists || song.artist)}</p>
                                </div>
                            ))}

                            {activeTab === 'albums' && albums.map((album: any) => (
                                <div
                                    key={album.id}
                                    onClick={() => navigate(`/albums/${album.id}`)}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-xl">
                                        <img
                                            src={album.image?.[2]?.url || album.image}
                                            alt={album.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(album.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Album • {decodeHtmlEntities(album.artist)}</p>
                                </div>
                            ))}

                            {activeTab === 'artists' && artists.map((artist: any) => (
                                <div
                                    key={artist.id}
                                    onClick={() => navigate(`/artists/${artist.id}`)}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all flex flex-col items-center text-center"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-full w-24 h-24">
                                        <img
                                            src={artist.image?.[2]?.url || artist.image}
                                            alt={artist.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white truncate w-full">{decodeHtmlEntities(artist.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5 uppercase tracking-wider">{artist.role || 'Artist'}</p>
                                </div>
                            ))}

                            {activeTab === 'playlists' && playlists.map((playlist: any) => (
                                <div
                                    key={playlist.id}
                                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-xl">
                                        <img
                                            src={playlist.image?.[2]?.url || playlist.image}
                                            alt={playlist.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(playlist.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Playlist</p>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default SearchPage;
