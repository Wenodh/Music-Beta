import React from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdSkipBackward, IoMdSkipForward, IoMdRefresh, IoMdSync } from 'react-icons/io';
import { PiShuffleBold, PiRepeatOnceBold } from 'react-icons/pi';
import { MdForward30, MdReplay10 } from 'react-icons/md';
import { BiRepeat } from 'react-icons/bi';
import { PlaybackPolicy } from '../../lib/playback/PlaybackPolicy';

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
    onSeekRelative?: (seconds: number) => void;
    policy?: PlaybackPolicy;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    shuffle,
    repeatMode,
    accentColor,
    onPlayPause,
    onNext,
    onPrev,
    onToggleShuffle,
    onToggleRepeat,
    onSeekRelative,
    policy
}) => {
    return (
        <div className="hidden md:flex text-2xl lg:text-3xl gap-6 lg:gap-8 lg:w-[40vw] justify-center items-center">
            {(policy?.canSeek || !policy) && (
                <button onClick={onToggleShuffle}>
                    <PiShuffleBold
                        style={shuffle ? { color: accentColor } : {}}
                        className={`${shuffle ? '' : 'text-gray-400'} cursor-pointer transition-colors`}
                    />
                </button>
            )}
            {policy?.canSkipPrevious && (
                <IoMdSkipBackward
                    onClick={onPrev}
                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer"
                />
            )}

            {!!policy?.skipBackwardInterval && (
                <button
                    onClick={() => onSeekRelative?.(-policy.skipBackwardInterval!)}
                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer flex flex-col items-center justify-center"
                >
                    <MdReplay10 size={28} />
                </button>
            )}

            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onPlayPause}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg"
            >
                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
            </motion.button>

            {!!policy?.skipForwardInterval && (
                <button
                    onClick={() => onSeekRelative?.(policy.skipForwardInterval!)}
                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer flex flex-col items-center justify-center"
                >
                    <MdForward30 size={28} />
                </button>
            )}

            {policy?.canSkipNext && (
                <IoMdSkipForward
                    onClick={onNext}
                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer"
                />
            )}
            {(policy?.canSeek || !policy) && (
                <button onClick={onToggleRepeat}>
                    {repeatMode === 'one' ? (
                        <PiRepeatOnceBold style={{ color: accentColor }} />
                    ) : (
                        <BiRepeat
                            style={repeatMode === 'all' ? { color: accentColor } : {}}
                            className={repeatMode === 'all' ? '' : 'text-gray-400'}
                        />
                    )}
                </button>
            )}
        </div>
    );
};

export default PlayerControls;
