import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setVolume } from '../features/musicplayer/musicPlayerSlice';

interface VolumeControllerProps {
    isVolumeVisible: boolean;
}

const VolumeController: React.FC<VolumeControllerProps> = ({ isVolumeVisible }) => {
    const dispatch = useAppDispatch();
    const { volume, isMuted } = useAppSelector(state => state.musicPlayer);
    const effectiveVolume = isMuted ? 0 : (typeof volume === 'number' && !isNaN(volume) ? volume : 0.7);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        dispatch(setVolume(newVolume));
    };

    return (
        <div
            className={`absolute bottom-full right-0 mb-4 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-xl rounded-2xl border border-white/20 transition-all duration-300 ${
                isVolumeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
        >
            <div className="h-24 flex flex-col items-center gap-2 select-none">
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={effectiveVolume}
                    aria-label="Volume with Booster"
                    onChange={handleVolumeChange}
                    className={`h-20 appearance-none bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer ${
                        effectiveVolume > 1.0 ? 'accent-amber-400' : 'accent-primary'
                    }`}
                    style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
                />
                <span className={`text-[10px] font-bold ${effectiveVolume > 1.0 ? 'text-amber-500' : 'text-gray-500'}`}>
                    {Math.round(effectiveVolume * 100)}%
                </span>
            </div>
        </div>
    );
};

export default VolumeController;
