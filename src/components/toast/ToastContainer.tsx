import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Toast } from '../../features/ui/uiSlice';

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    React.useEffect(() => {
        if (isHovered) return;

        const duration = toast.duration || (toast.action ? 10000 : 3000);
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, duration);

        return () => clearTimeout(timer);
    }, [isHovered, toast.id, onRemove, toast.action, toast.duration]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md flex flex-col gap-3 min-w-[240px] ${
                toast.type === 'success'
                    ? 'bg-green-500/90 border-green-400 text-white'
                    : toast.type === 'error'
                    ? 'border-red-400 text-white'
                    : 'bg-gray-800/90 border-gray-700 text-white'
            }`}
            style={toast.type === 'error' ? { backgroundColor: 'rgba(var(--accent-rgb), 0.9)' } : {}}
            >
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium flex-1">{toast.message}</span>
                    <button
                        onClick={() => onRemove(toast.id)}
                        className="hover:opacity-70 text-xs p-1"
                    >
                        ✕
                    </button>
                </div>
                {toast.action && (
                    <div className="flex justify-end gap-2 mt-1">
                        <button
                            onClick={() => {
                                toast.action?.onClick();
                                onRemove(toast.id);
                            }}
                            className="px-3 py-1 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            {toast.action.label}
                        </button>
                        <button
                            onClick={() => onRemove(toast.id)}
                            className="px-3 py-1 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
