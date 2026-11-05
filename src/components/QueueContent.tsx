import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { reorderQueue, removeFromQueue, playMusic, clearQueue, playNextInQueue } from '../features/musicplayer/musicPlayerSlice';
import { motion, Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import { IoReorderThreeOutline, IoTrashOutline, IoPlayForwardOutline } from 'react-icons/io5';
import { Song } from '../types/music';

interface QueueItemProps {
    song: Song;
    isActive: boolean;
    onPlay: (song: Song) => void;
    onRemove: (id: string) => void;
}

const QueueItem: React.FC<QueueItemProps> = ({ song, isActive, onPlay, onRemove }) => {
    const dragControls = useDragControls();
    const isPlaying = useAppSelector((state) => state.musicPlayer.isPlaying);

    return (
        <Reorder.Item
            value={song}
            dragListener={false}
            dragControls={dragControls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-3 p-2 rounded-xl group mb-1 transition-colors ${
                isActive ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800/40'
            }`}
        >
            <div
                className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <IoReorderThreeOutline size={20} />
            </div>

            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 cursor-pointer" onClick={() => onPlay(song)}>
                <img
                    src={Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image}
                    alt=""
                    className="w-full h-full object-cover"
                />
                {isActive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-3">
                            <span className={`w-0.5 bg-primary ${isPlaying ? 'animate-bounce h-full' : 'h-1.5'}`} />
                            <span className={`w-0.5 bg-primary ${isPlaying ? 'animate-bounce delay-75 h-2/3' : 'h-3'}`} />
                            <span className={`w-0.5 bg-primary ${isPlaying ? 'animate-bounce delay-150 h-full' : 'h-2'}`} />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPlay(song)}>
                <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                    {song.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(song.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50"
            >
                <IoTrashOutline size={18} />
            </button>
        </Reorder.Item>
    );
};

export const QueueContent: React.FC = () => {
    const { songs, currentSong, recommendations } = useAppSelector((state) => state.musicPlayer);
    const dispatch = useAppDispatch();

    const handleReorder = (newOrder: Song[]) => {
        dispatch(reorderQueue(newOrder));
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-2">
            <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {songs.length} Tracks
                </span>
                {songs.length > 0 && (
                    <button
                        onClick={() => dispatch(clearQueue())}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1 font-medium"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <Reorder.Group axis="y" values={songs} onReorder={handleReorder} className="flex flex-col gap-1">
                <AnimatePresence initial={false}>
                    {songs.map((song) => (
                        <QueueItem
                            key={song.id}
                            song={song}
                            isActive={currentSong?.id === song.id}
                            onPlay={(s) => dispatch(playMusic(s))}
                            onRemove={(id) => dispatch(removeFromQueue(id))}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>

            {songs.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                    <IoPlayForwardOutline size={48} className="mb-2 opacity-50 stroke-[1.5]" />
                    <p className="text-base font-semibold">Queue is empty</p>
                    <p className="text-xs opacity-75 mt-1 max-w-[200px]">Add songs from albums, playlists, or discover new tracks.</p>
                </div>
            )}

            {recommendations && recommendations.length > 0 && (
                <div className="mt-6 mb-4 px-2">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-2 uppercase tracking-wider">
                        Suggested Songs
                    </h3>
                    {recommendations.map((song) => (
                        <div
                            key={song.id}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 mb-1 group"
                            onClick={() => dispatch(playMusic(song))}
                        >
                            <img
                                src={Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image}
                                alt=""
                                className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{song.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{song.primaryArtists}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(playNextInQueue(song));
                                    }}
                                    title="Play Next"
                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                >
                                    PLAY NEXT
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(reorderQueue([...songs, song]));
                                    }}
                                    title="Add to End of Queue"
                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-primary/10 dark:bg-red-900/20 text-primary rounded text-[10px] font-bold hover:bg-primary/20 transition-all"
                                >
                                    ADD
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QueueContent;
