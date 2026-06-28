import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronDown } from 'react-icons/io5';
import { Song } from '../../../types/music';
import { decodeHtmlEntities } from '../../../utils/decodeHtml';

interface TrackInfoOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    song: Song;
    imageUrl: string;
    recommendations?: Song[];
    onPlayTrack: (song: Song) => void;
    formatTime: (time: number) => string;
}

const TrackInfoOverlay: React.FC<TrackInfoOverlayProps> = ({
    isOpen,
    onClose,
    song,
    imageUrl,
    recommendations,
    onPlayTrack,
    formatTime
}) => {
    const duration = parseFloat(song.duration?.toString() || '0');

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed inset-0 z-[230] bg-black/90 backdrop-blur-2xl flex flex-col"
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold">Track Info</h2>
                        <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
                            <IoChevronDown size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="space-y-8">
                            <div className="flex gap-6 items-center">
                                <img src={imageUrl} alt="" className="w-32 h-32 rounded-3xl shadow-2xl object-cover" />
                                <div>
                                    <h3 className="text-2xl font-black">{decodeHtmlEntities(song.name)}</h3>
                                    <p className="text-primary font-bold">{decodeHtmlEntities(song.primaryArtists)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { label: 'Album', value: decodeHtmlEntities(typeof song.album === 'string' ? song.album : song.album?.name || 'Single') },
                                    { label: 'Release Year', value: song.year || 'N/A' },
                                    { label: 'Duration', value: formatTime(duration) },
                                    { label: 'Language', value: song.language || 'N/A' }
                                ].map(item => (
                                    <div key={item.label} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                                        <p className="font-bold">{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {recommendations && Array.isArray(recommendations) && recommendations.length > 0 && (
                                <div>
                                    <h4 className="text-lg font-black mb-4">You might also like</h4>
                                    <div className="space-y-3">
                                        {recommendations.slice(0, 5).map(recSong => (
                                            <div
                                                key={recSong.id}
                                                onClick={() => onPlayTrack(recSong)}
                                                className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                                            >
                                                <img
                                                    src={Array.isArray(recSong.image) ? recSong.image[(recSong.image.length || 0) - 1]?.url : recSong.image}
                                                    className="w-12 h-12 rounded-xl object-cover"
                                                    alt=""
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold truncate">{decodeHtmlEntities(recSong.name)}</p>
                                                    <p className="text-xs text-gray-400 truncate">{decodeHtmlEntities(recSong.primaryArtists)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TrackInfoOverlay;
