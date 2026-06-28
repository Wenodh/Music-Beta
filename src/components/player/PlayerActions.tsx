import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoHeartOutline, IoHeart, IoAddCircleOutline, IoEllipsisVertical } from 'react-icons/io5';
import { HiQueueList, HiSpeakerWave } from 'react-icons/hi2';
import { MdOutlineGraphicEq, MdBarChart, MdShowChart, MdBubbleChart, MdDonutLarge, MdApps, MdSpeed } from 'react-icons/md';
import { PiShuffleBold } from 'react-icons/pi';
import { RiShareForwardLine } from 'react-icons/ri';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import SleepTimer from '../SleepTimer';
import { PlaybackPolicy } from '../../lib/playback/PlaybackPolicy';

interface PlayerActionsProps {
    isFavorite: boolean;
    isQueueOpen: boolean;
    isSongRadioEnabled: boolean;
    visualizerStyle: string;
    playbackSpeed: number;
    userVolume: number;
    isMoreMenuOpen: boolean;
    isDownloading: boolean;
    accentColor: string;
    onToggleFavorite: () => void;
    onToggleQueue: () => void;
    onOpenPlaylistModal: () => void;
    onOpenEqualizer: () => void;
    onSetVisualizerStyle: (style: any) => void;
    onToggleRadio: () => void;
    onDownload: () => void;
    onShare: () => void;
    onSetPlaybackSpeed: (speed: number) => void;
    onSetVolume: (volume: number) => void;
    onToggleMoreMenu: (e: React.MouseEvent) => void;
    moreMenuRef: React.RefObject<HTMLDivElement>;
    policy?: PlaybackPolicy;
}

const PlayerActions: React.FC<PlayerActionsProps> = ({
    isFavorite,
    isQueueOpen,
    isSongRadioEnabled,
    visualizerStyle,
    playbackSpeed,
    userVolume,
    isMoreMenuOpen,
    isDownloading,
    accentColor,
    onToggleFavorite,
    onToggleQueue,
    onOpenPlaylistModal,
    onOpenEqualizer,
    onSetVisualizerStyle,
    onToggleRadio,
    onDownload,
    onShare,
    onSetPlaybackSpeed,
    onSetVolume,
    onToggleMoreMenu,
    moreMenuRef,
    policy
}) => {
    return (
        <div className="flex lg:w-[30vw] justify-end items-center gap-2 md:gap-5">
            <div className="relative" ref={moreMenuRef}>
                <button
                    onClick={onToggleMoreMenu}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                    <IoEllipsisVertical className="text-xl" />
                </button>
                <AnimatePresence>
                    {isMoreMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full right-0 mb-4 w-60 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-700 py-2 z-[60] overflow-y-auto max-h-[70vh] custom-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(policy?.canChangeSpeed || !policy) && (
                                <div className="px-4 py-2 border-b dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2 uppercase">
                                        <MdSpeed size={16} /> Speed
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {[0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                                            <button
                                                key={speed}
                                                onClick={() => onSetPlaybackSpeed(speed)}
                                                className={`flex-[1_0_28%] py-1 rounded-md text-[10px] font-bold ${playbackSpeed === speed ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button onClick={onToggleFavorite} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                {isFavorite ? <IoHeart className="text-primary" /> : <IoHeartOutline />} {isFavorite ? 'Remove Favorite' : 'Add to Favorite'}
                            </button>
                            <button onClick={onToggleQueue} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <HiQueueList className={isQueueOpen ? 'text-primary' : ''} /> {isQueueOpen ? 'Close Queue' : 'Open Queue'}
                            </button>
                            <button onClick={onOpenPlaylistModal} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <IoAddCircleOutline /> Add to Playlist
                            </button>
                            <button onClick={onOpenEqualizer} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <MdOutlineGraphicEq /> Equalizer
                            </button>
                            <div className="border-t dark:border-gray-700 my-1 pt-1">
                                <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase">Visualizer</p>
                                <div className="flex px-4 py-2 gap-2">
                                    {['bars', 'waveform', 'particles', 'circular', 'pixel'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => onSetVisualizerStyle(style as any)}
                                            className={`p-2 rounded-lg ${visualizerStyle === style ? 'text-primary' : 'hover:bg-gray-100'}`}
                                            style={visualizerStyle === style ? { backgroundColor: 'rgba(var(--accent-rgb), 0.2)' } : {}}
                                        >
                                            {style === 'bars' && <MdBarChart />}
                                            {style === 'waveform' && <MdShowChart />}
                                            {style === 'particles' && <MdBubbleChart />}
                                            {style === 'circular' && <MdDonutLarge />}
                                            {style === 'pixel' && <MdApps />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={onToggleRadio} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <PiShuffleBold className={isSongRadioEnabled ? 'text-primary' : ''} /> Radio: {isSongRadioEnabled ? 'ON' : 'OFF'}
                            </button>
                            <SleepTimer showLabel />
                            <button onClick={onDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                {isDownloading ? <AiOutlineLoading3Quarters className="animate-spin text-primary" /> : <LuHardDriveDownload />} Download
                            </button>
                            <button onClick={onShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <RiShareForwardLine /> Share
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="relative group hidden lg:block" onClick={(e) => e.stopPropagation()}>
                <HiSpeakerWave className="text-2xl cursor-pointer hover:text-primary transition-colors" />
                <div className="absolute bottom-full right-0 mb-4 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-xl rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={userVolume}
                        onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                        className="h-20 appearance-none bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer vertical-slider"
                        style={{ appearance: 'slider-vertical' } as any}
                    />
                </div>
            </div>
        </div>
    );
};

export default PlayerActions;
