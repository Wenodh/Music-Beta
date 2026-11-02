import React from 'react';
import { useAppSelector } from '../../../hooks/redux';
import { decodeHtmlEntities } from '../../../utils/decodeHtml';
import { extractImageUrl } from '../../../utils/imageUtils';
import { IoMusicalNotes } from 'react-icons/io5';

export const NowPlayingMini: React.FC = () => {
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);

    if (!currentSong) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-gray-400">
                <IoMusicalNotes className="text-gray-500" />
                <span>No music playing</span>
            </div>
        );
    }

    const imageUrl = extractImageUrl(currentSong as any);

    return (
        <div className="flex items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-sm w-full max-w-xs sm:max-w-sm">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden shrink-0">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                {isPlaying && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">
                    {decodeHtmlEntities(currentSong.name)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">
                    {decodeHtmlEntities(typeof currentSong.primaryArtists === 'string' ? currentSong.primaryArtists : 'Artist')}
                </p>
            </div>
            <span className="text-[8px] sm:text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold shrink-0">
                {isPlaying ? 'Playing' : 'Paused'}
            </span>
        </div>
    );
};
