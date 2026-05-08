import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setEqualizerOpen, updateEqualizerGains, toggleEqualizer } from '../features/musicplayer/musicPlayerSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline, IoMusicalNoteOutline } from 'react-icons/io5';

const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const PRESETS = {
    Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    Pop: [-1.5, 3.5, 5, 4.5, 2.5, -1.5, -2, -1.5, -1, -1],
    Rock: [5, 3.5, 2.5, 1, -1.5, -2, 0, 2.5, 4, 5],
    Jazz: [3, 2, 1, 2, -1.5, -1.5, 0, 1.5, 2.5, 3.5],
    Classic: [4.5, 3, 2.5, 2, -1.5, -1.5, 0, 3, 4, 4.5],
    Dance: [3.5, 6, 5, 0, 2, 4, 5.5, 5, 4, 0],
    Bass: [6, 5, 4, 0, 0, 0, 0, 0, 0, 0],
    Treble: [0, 0, 0, 0, 0, 0, 4, 5, 6, 7],
};

const Equalizer: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isEqualizerOpen, equalizerSettings } = useAppSelector((state) => state.musicPlayer);

    const handleGainChange = (index: number, value: number) => {
        const newGains = [...equalizerSettings.gains];
        newGains[index] = value;
        dispatch(updateEqualizerGains(newGains));
    };

    const applyPreset = (presetName: keyof typeof PRESETS) => {
        dispatch(updateEqualizerGains(PRESETS[presetName]));
    };

    return (
        <AnimatePresence>
            {isEqualizerOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(setEqualizerOpen(false))}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[80vh] md:h-auto md:max-w-4xl md:mx-auto md:bottom-10 md:rounded-3xl bg-white dark:bg-gray-900 shadow-2xl z-[130] overflow-hidden flex flex-col"
                    >
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <IoMusicalNoteOutline className="text-red-500" /> Audio Equalizer
                                </h2>
                                <p className="text-xs text-gray-500 font-medium">Fine-tune your sound experience</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 mr-4">
                                    <span className="text-xs font-bold uppercase text-gray-400">Enabled</span>
                                    <button
                                        onClick={() => dispatch(toggleEqualizer(!equalizerSettings.enabled))}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${equalizerSettings.enabled ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <motion.div
                                            animate={{ x: equalizerSettings.enabled ? 24 : 4 }}
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>
                                <button
                                    onClick={() => dispatch(setEqualizerOpen(false))}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <IoCloseOutline size={28} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="mb-8">
                                <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-widest">Presets</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => applyPreset(name)}
                                            className="px-4 py-2 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-700 hover:border-red-500 hover:text-red-500 transition-all dark:bg-gray-800/50"
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`grid grid-cols-5 md:grid-cols-10 gap-4 h-64 md:h-80 transition-opacity ${!equalizerSettings.enabled ? 'opacity-30 pointer-events-none' : ''}`}>
                                {BANDS.map((freq, i) => (
                                    <div key={freq} className="flex flex-col items-center gap-4 h-full group">
                                        <div className="relative flex-1 w-1 bg-gray-100 dark:bg-gray-800 rounded-full flex justify-center">
                                            <input
                                                type="range"
                                                min="-12"
                                                max="12"
                                                step="0.5"
                                                value={equalizerSettings.gains[i]}
                                                onChange={(e) => handleGainChange(i, parseFloat(e.target.value))}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 -rotate-90 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                                            />
                                            <div
                                                className="absolute bottom-0 w-1 bg-red-500/30 rounded-full"
                                                style={{ height: `${((equalizerSettings.gains[i] + 12) / 24) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black text-red-500">{equalizerSettings.gains[i] > 0 ? '+' : ''}{equalizerSettings.gains[i]}dB</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {freq >= 1000 ? `${freq / 1000}k` : freq}Hz
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/30 text-center text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
                            Professional Audio Engine by VibeOn
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Equalizer;
