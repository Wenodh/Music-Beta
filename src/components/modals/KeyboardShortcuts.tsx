import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoLaptopOutline } from 'react-icons/io5';

interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
    const shortcuts = [
        { key: 'Space', desc: 'Play / Pause' },
        { key: 'Ctrl + →', desc: 'Next Song' },
        { key: 'Ctrl + ←', desc: 'Previous Song' },
        { key: 'M', desc: 'Toggle Mute' },
        { key: '?', desc: 'Toggle this help menu' },
        { key: 'Esc', desc: 'Close modals/drawers' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10 p-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <IoLaptopOutline className="text-red-500" /> Keyboard Shortcuts
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <IoClose size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {shortcuts.map((s, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</span>
                                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono font-bold border border-gray-200 dark:border-gray-700">
                                        {s.key}
                                    </kbd>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-8 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                        >
                            Got it
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default KeyboardShortcuts;
