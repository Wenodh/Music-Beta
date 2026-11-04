import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose,
    IoNotificationsOutline,
    IoCheckmarkDoneOutline,
    IoPersonAddOutline,
    IoCallOutline,
    IoTimeOutline,
    IoMailOutline,
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import {
    markNotificationRead,
    markAllNotificationsRead,
    setActiveProfileView,
} from '../../social/socialSlice';
import { SocialNotification } from '../../../types/social';
import { socialService } from '../../../services/socialService';

interface SocialNotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SocialNotificationsModal: React.FC<SocialNotificationsModalProps> = ({
    isOpen,
    onClose,
}) => {
    const dispatch = useAppDispatch();
    const { notifications, unreadNotificationsCount } = useAppSelector((state) => state.social);

    if (!isOpen) return null;

    const handleNotificationClick = async (notif: SocialNotification) => {
        if (!notif.is_read) {
            dispatch(markNotificationRead(notif.id));
        }

        // Contextual navigation
        if (notif.actor_id) {
            const profile = await socialService.getProfile(notif.actor_id);
            if (profile) {
                dispatch(setActiveProfileView(profile));
                onClose();
            }
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'friend_request_received':
            case 'friend_request_accepted':
                return <IoPersonAddOutline className="text-primary" size={16} />;
            case 'missed_call':
                return <IoCallOutline className="text-red-400" size={16} />;
            default:
                return <IoMailOutline className="text-blue-400" size={16} />;
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-gray-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                <IoNotificationsOutline size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Notifications</h3>
                                <p className="text-[10px] text-gray-400">
                                    {unreadNotificationsCount} unread
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => dispatch(markAllNotificationsRead())}
                                    className="px-2.5 py-1 text-[11px] font-bold text-primary hover:text-white hover:bg-primary/20 rounded-xl transition-all flex items-center gap-1"
                                >
                                    <IoCheckmarkDoneOutline size={14} />
                                    <span>Read All</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
                            >
                                <IoClose size={20} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                        notif.is_read
                                            ? 'bg-white/5 border-white/5 hover:bg-white/10 opacity-70'
                                            : 'bg-primary/10 border-primary/20 hover:bg-primary/15'
                                    }`}
                                >
                                    <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5">
                                        {getIconForType(notif.type)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                                            <span className="text-[9px] text-gray-400 shrink-0 flex items-center gap-0.5">
                                                <IoTimeOutline size={10} />
                                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-300 leading-relaxed">{notif.message}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
                                <IoNotificationsOutline size={32} className="mb-2 opacity-30" />
                                <p className="text-xs font-semibold text-gray-300">All caught up!</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    No social notifications at this time.
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
