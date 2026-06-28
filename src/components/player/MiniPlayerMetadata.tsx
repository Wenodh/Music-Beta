import React from 'react';
import { motion } from 'framer-motion';
import Marquee from '../Marquee';
import { decodeHtmlEntities } from '../../utils/decodeHtml';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface MiniPlayerMetadataProps {
    imageUrl: string;
    name: string;
    artists: string;
    isBuffering: boolean;
    onDoubleTap: (side: 'left' | 'right') => void;
}

const MiniPlayerMetadata: React.FC<MiniPlayerMetadataProps & { isLive?: boolean }> = ({
    imageUrl,
    name,
    artists,
    isBuffering,
    onDoubleTap,
    isLive
}) => {
    return (
        <div className="flex justify-start items-center gap-3 md:gap-4 flex-1 min-w-0 lg:w-[30vw]">
            <div className="relative group shrink-0">
                <motion.img
                    layoutId="player-album-art"
                    src={imageUrl}
                    alt=""
                    className="w-[48px] h-[48px] md:w-[55px] md:h-[55px] rounded-xl shadow-lg object-cover"
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        onDoubleTap(e.clientX - rect.left < rect.width / 2 ? 'left' : 'right');
                    }}
                />
                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                        <AiOutlineLoading3Quarters className="animate-spin text-white" size={24} />
                    </div>
                )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0 max-w-[180px] xs:max-w-[240px] flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                    <Marquee text={decodeHtmlEntities(name)} className="font-bold text-[13px] md:text-base leading-tight flex-1" />
                    {isLive && (
                        <span
                            role="status"
                            aria-label="Live Radio Station"
                            className="shrink-0 text-[8px] font-bold text-white bg-red-500 px-1 rounded flex items-center gap-0.5 h-3.5"
                        >
                            <span className="w-1 h-1 rounded-full bg-white animate-pulse" aria-hidden="true" />
                            LIVE
                        </span>
                    )}
                </div>
                <Marquee text={decodeHtmlEntities(artists)} className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium opacity-80" speed={20} />
            </div>
        </div>
    );
};

export default MiniPlayerMetadata;
