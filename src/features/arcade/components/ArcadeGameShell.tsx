import React from 'react';
import { GameTheme } from '../types';
import { ArcadeExitModal } from './ArcadeExitModal';
import { IoArrowBack, IoPause, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';

interface ArcadeGameShellProps {
    title: string;
    scoreDisplay?: string | number;
    highScoreDisplay?: string | number;
    modeBadge?: string;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onPause: () => void;
    showPauseButton?: boolean;
    showExitModal: boolean;
    onResume: () => void;
    onRestart?: () => void;
    onExit: () => void;
    theme?: GameTheme;
    children: React.ReactNode;
}

export const ArcadeGameShell: React.FC<ArcadeGameShellProps> = ({
    title,
    scoreDisplay,
    highScoreDisplay,
    modeBadge,
    isMuted,
    onToggleMute,
    onPause,
    showPauseButton = true,
    showExitModal,
    onResume,
    onRestart,
    onExit,
    theme,
    children,
}) => {
    return (
        <div className="fixed inset-0 z-[400] md:relative md:inset-auto flex flex-col items-center justify-between select-none bg-black md:bg-transparent touch-none h-[100dvh] w-full max-w-full overflow-hidden p-2 sm:p-4">
            {/* Top Navigation HUD */}
            <div className="w-full max-w-xl flex items-center justify-between z-20 px-2 py-1">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPause}
                        className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all cursor-pointer"
                        aria-label="Back / Pause"
                    >
                        <IoArrowBack size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-sm sm:text-base font-black text-white tracking-tight">{title}</h2>
                            {modeBadge && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                                    {modeBadge}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {scoreDisplay !== undefined && (
                    <div className="flex flex-col items-center">
                        <span className="text-xl sm:text-2xl font-black text-white font-mono drop-shadow">
                            {scoreDisplay}
                        </span>
                        {highScoreDisplay !== undefined && (
                            <span className="text-[10px] font-bold text-amber-400 drop-shadow">
                                Best: {highScoreDisplay}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-1.5">
                    {showPauseButton && (
                        <button
                            onClick={onPause}
                            className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full border border-white/15 shadow-xl active:scale-95 transition-all cursor-pointer"
                            aria-label="Pause Game"
                        >
                            <IoPause size={18} />
                        </button>
                    )}
                    {onToggleMute && (
                        <button
                            onClick={onToggleMute}
                            className={`p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full border border-white/15 shadow-xl active:scale-95 transition-all cursor-pointer ${
                                !isMuted ? 'text-primary' : 'text-gray-400'
                            }`}
                            aria-label="Toggle SFX"
                        >
                            {isMuted ? <IoVolumeMute size={18} /> : <IoVolumeHigh size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Game Content Viewport */}
            <div className="relative w-full max-w-xl flex-1 flex flex-col items-center justify-center overflow-hidden my-auto">
                {children}
            </div>

            {/* In-Game Pause & Exit Modal */}
            <ArcadeExitModal
                isOpen={showExitModal}
                onResume={onResume}
                onRestart={onRestart}
                onExit={onExit}
            />
        </div>
    );
};
