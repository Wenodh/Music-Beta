import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="pointer-events-auto"
                    >
                        <div className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 min-w-[200px] ${
                            toast.type === 'success'
                                ? 'bg-green-500/90 border-green-400 text-white'
                                : toast.type === 'error'
                                ? 'bg-red-500/90 border-red-400 text-white'
                                : 'bg-gray-800/90 border-gray-700 text-white'
                        }`}>
                            <span className="text-sm font-medium">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-auto hover:opacity-70"
                            >
                                ✕
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
