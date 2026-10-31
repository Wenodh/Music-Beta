import React from 'react';
import { motion } from 'framer-motion';
import { IoClose, IoColorPaletteOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { ArcadeSettings, ThemeSelectionMode } from '../types';
import { PREDEFINED_THEMES } from '../engine/themeRegistry';

interface ThemeSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ArcadeSettings;
    onUpdateSettings: (newSettings: ArcadeSettings) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
    isOpen,
    onClose,
    settings,
    onUpdateSettings,
}) => {
    if (!isOpen) return null;

    const setMode = (mode: ThemeSelectionMode) => {
        onUpdateSettings({ ...settings, themeMode: mode });
    };

    const setTheme = (themeId: string) => {
        onUpdateSettings({
            ...settings,
            themeMode: 'manual',
            selectedThemeId: themeId,
        });
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                            <IoColorPaletteOutline size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white">Arcade Themes</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full">
                        <IoClose size={22} />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex p-1 bg-white/5 rounded-2xl gap-1">
                    <button
                        onClick={() => setMode('auto')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${settings.themeMode === 'auto' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        Automatic
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${settings.themeMode === 'manual' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        Manual
                    </button>
                    <button
                        onClick={() => setMode('default')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${settings.themeMode === 'default' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        Classic
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {PREDEFINED_THEMES.map((t) => {
                        const isSelected = settings.themeMode === 'manual' && settings.selectedThemeId === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                                    isSelected
                                        ? 'bg-primary/20 border-primary/40 text-white shadow-md'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-6 h-6 rounded-lg shadow-sm border border-white/20 shrink-0"
                                        style={{ backgroundColor: t.colors.accent }}
                                    />
                                    <div>
                                        <p className="text-xs font-bold">{t.name}</p>
                                        <p className="text-[10px] text-gray-400">{t.artistOrGenre}</p>
                                    </div>
                                </div>
                                {isSelected && <IoCheckmarkCircle className="text-primary" size={20} />}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};
