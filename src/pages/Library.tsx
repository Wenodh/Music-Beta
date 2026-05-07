import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { createPlaylist, deletePlaylist } from '../features/library/librarySlice';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { IoAdd, IoHeart, IoTrash, IoMusicalNote, IoGridOutline, IoListOutline, IoFilterOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

const Library: React.FC = () => {
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const dispatch = useAppDispatch();
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'favorites' | 'playlists'>('favorites');
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'artist' | 'date'>('date');

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            dispatch(createPlaylist(newPlaylistName.trim()));
            setNewPlaylistName('');
            setIsCreating(false);
        }
    };

    const currentPlaylist = playlists.find(p => p.id === selectedPlaylist);

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-32">
            <h1 className="text-3xl font-bold mb-8">My Library</h1>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-100 dark:border-gray-800">
                <div className="flex gap-4">
                    <button
                        onClick={() => { setActiveTab('favorites'); setSelectedPlaylist(null); }}
                        className={`pb-4 px-2 font-semibold transition-colors relative ${activeTab === 'favorites' && !selectedPlaylist ? 'text-red-500' : 'text-gray-500'}`}
                    >
                        Favorites
                        {activeTab === 'favorites' && !selectedPlaylist && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('playlists')}
                        className={`pb-4 px-2 font-semibold transition-colors relative ${activeTab === 'playlists' || selectedPlaylist ? 'text-red-500' : 'text-gray-500'}`}
                    >
                        Playlists
                        {(activeTab === 'playlists' || selectedPlaylist) && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
                    </button>
                </div>

                <div className="flex items-center gap-4 pb-4 md:pb-0">
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
                            className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium"
                        >
                            <option value="date">Recently Added</option>
                            <option value="name">A-Z (Name)</option>
                            <option value="artist">A-Z (Artist)</option>
                        </select>
                    </div>
                </div>
            </div>

            {activeTab === 'favorites' && !selectedPlaylist && (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                    : "space-y-2"
                }>
                    {favorites.length > 0 ? (
                        [...favorites].sort((a, b) => {
                            if (sortBy === 'name') return a.name.localeCompare(b.name);
                            if (sortBy === 'artist') return a.primaryArtists.localeCompare(b.primaryArtists);
                            return 0; // Default is date, but favorites aren't timestamped, so we keep order
                        }).map((song) => (
                            <motion.div
                                key={song.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`group cursor-pointer ${viewMode === 'list' ? 'flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                                onClick={() => dispatch(playMusic(song))}
                            >
                                <div className={`relative overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 ${viewMode === 'list' ? 'w-12 h-12 rounded-lg' : 'aspect-square mb-3 rounded-xl'}`}>
                                    <img
                                        src={Array.isArray(song.image) ? song.image[song.image.length - 1].url : song.image}
                                        alt={song.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <IoHeart className="text-red-500 text-xl" />
                                    </div>
                                </div>
                                <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                                    <p className="font-semibold truncate text-sm">{song.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            <IoHeart size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No favorite songs yet.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'playlists' && !selectedPlaylist && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsCreating(true)}
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2 hover:border-red-500 hover:text-red-500 transition-colors"
                    >
                        <IoAdd size={32} />
                        <span className="font-semibold text-sm">New Playlist</span>
                    </motion.button>

                    {playlists.map((playlist) => (
                        <motion.div
                            key={playlist.id}
                            layout
                            className="group cursor-pointer"
                            onClick={() => setSelectedPlaylist(playlist.id)}
                        >
                            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300">
                                {playlist.songs.length > 0 ? (
                                    <img
                                        src={Array.isArray(playlist.songs[0].image) ? playlist.songs[0].image[playlist.songs[0].image.length - 1].url : playlist.songs[0].image}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                ) : (
                                    <IoMusicalNote size={40} className="text-gray-300 dark:text-gray-700" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white font-bold">{playlist.songs.length} songs</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold truncate text-sm">{playlist.name}</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(deletePlaylist(playlist.id));
                                    }}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-all"
                                >
                                    <IoTrash size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {selectedPlaylist && currentPlaylist && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="mb-6 text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                        ← Back to Playlists
                    </button>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold">{currentPlaylist.name}</h2>
                        <span className="text-gray-500">{currentPlaylist.songs.length} songs</span>
                    </div>

                    <div className="space-y-2">
                        {currentPlaylist.songs.map((song) => (
                            <div
                                key={song.id}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 group cursor-pointer"
                                onClick={() => dispatch(playMusic(song))}
                            >
                                <img
                                    src={Array.isArray(song.image) ? song.image[0].url : song.image}
                                    alt=""
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{song.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
                                </div>
                            </div>
                        ))}
                        {currentPlaylist.songs.length === 0 && (
                            <p className="text-center py-20 text-gray-500">This playlist is empty.</p>
                        )}
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setIsCreating(false)}
                    >
                        <motion.form
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={handleCreatePlaylist}
                        >
                            <h3 className="text-xl font-bold mb-6">Create New Playlist</h3>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Playlist Name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-red-500 outline-none"
                            />
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Library;
