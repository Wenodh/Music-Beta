import React from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { useAppSelector } from '../hooks/redux';

interface SongItemProps {
    id: string;
    title: string;
    image: any;
    type?: string;
    primaryArtists?: string;
}

const SongItem: React.FC<SongItemProps> = React.memo(({
    id,
    title,
    image,
    type,
    primaryArtists,
}) => {
    const navigate = useNavigate();
    const currentSongId = useAppSelector((state) => state.musicPlayer.currentSong?.id);
    const isPlaying = useAppSelector((state) => state.musicPlayer.isPlaying);
    const isCurrent = currentSongId === id;

    const handleClick = () => {
        if (type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'artist') {
            navigate(`/artists/${id}`);
        } else {
            navigate(`/albums/${id}`);
        }
    };

    const imageUrl = Array.isArray(image) ? image[image.length - 1]?.url : (image || '');

    return (
        <div
            onClick={handleClick}
            className="flex flex-col items-center p-3 sm:p-4 rounded-2xl glass-card hover:border-primary/40 cursor-pointer group transition-all duration-300"
        >
            <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-xl shadow-xl">
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    className={`w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out ${isCurrent ? 'brightness-50' : ''}`}
                />
                {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                        <div className="flex gap-1 items-end h-8">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.8)] ${isPlaying ? 'animate-equalizer transform-gpu' : 'h-2'}`}
                                    style={{
                                        animationDelay: `${i * 0.1}s`,
                                        height: isPlaying ? undefined : `${(i % 3 + 1) * 6}px`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <p className="text-sm font-bold text-center truncate w-full group-hover:text-primary transition-colors">{decodeHtmlEntities(title)}</p>
            {primaryArtists && (
                <p className="text-xs text-slate-400 text-center truncate w-full mt-0.5 font-medium">
                    {decodeHtmlEntities(primaryArtists)}
                </p>
            )}
        </div>
    );
});

SongItem.displayName = 'SongItem';

export default SongItem;
