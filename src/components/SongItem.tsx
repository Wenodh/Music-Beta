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

const SongItem: React.FC<SongItemProps> = ({
    id,
    title,
    image,
    type,
    primaryArtists,
}) => {
    const navigate = useNavigate();
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);
    const isCurrent = currentSong?.id === id;

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
            className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
        >
            <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg shadow-lg">
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${isCurrent ? 'brightness-50' : ''}`}
                />
                {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex gap-1 items-end h-8">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 bg-primary rounded-full ${isPlaying ? 'animate-equalizer transform-gpu' : 'h-2'}`}
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
            <p className="text-sm font-semibold text-center truncate w-full">{decodeHtmlEntities(title)}</p>
            {primaryArtists && (
                <p className="text-xs text-gray-500 text-center truncate w-full">
                    {decodeHtmlEntities(primaryArtists)}
                </p>
            )}
        </div>
    );
};

export default SongItem;
