import React from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold, PiRepeatOnceBold } from 'react-icons/pi';
import { BiRepeat } from 'react-icons/bi';

interface PlayerControlsProps {
    isPlaying: boolean;
    shuffle: boolean;
    repeatMode: 'none' | 'all' | 'one';
    accentColor: string;
    onPlayPause: (e: React.MouseEvent) => void;
    onNext: (e: React.MouseEvent) => void;
    onPrev: (e: React.MouseEvent) => void;
    onToggleShuffle: (e: React.MouseEvent) => void;
    onToggleRepeat: (e: React.MouseEvent) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
    isPlaying,
    shuffle,
    repeatMode,
    accentColor,
    onPlayPause,
    onNext,
    onPrev,
    onToggleShuffle,
    onToggleRepeat
}) => {
    return (
        <div className="hidden md:flex text-2xl lg:text-3xl gap-6 lg:gap-8 lg:w-[40vw] justify-center items-center">
            <button data-testid="shuffle-button" onClick={onToggleShuffle}>
                <PiShuffleBold
                    style={shuffle ? { color: accentColor } : {}}
                    className={`${shuffle ? '' : 'text-gray-400'} cursor-pointer transition-colors`}
                />
            </button>
            <IoMdSkipBackward
                data-testid="prev-button"
                onClick={onPrev}
                className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer"
            />
            <motion.button
                data-testid="play-pause-button"
                whileTap={{ scale: 0.9 }}
                onClick={onPlayPause}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg"
            >
                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
            </motion.button>
            <IoMdSkipForward
                data-testid="next-button"
                onClick={onNext}
                className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer"
            />
            <button data-testid="repeat-button" onClick={onToggleRepeat}>
                {repeatMode === 'one' ? (
                    <PiRepeatOnceBold style={{ color: accentColor }} />
                ) : (
                    <BiRepeat
                        style={repeatMode === 'all' ? { color: accentColor } : {}}
                        className={repeatMode === 'all' ? '' : 'text-gray-400'}
                    />
                )}
            </button>
        </div>
    );
});

export default PlayerControls;
