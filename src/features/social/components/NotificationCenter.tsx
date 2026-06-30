import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationCenter: React.FC = () => {
    const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

    const renderSkeletons = () => (
        <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 rounded-xl flex gap-4 items-center bg-white/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 w-3/4 rounded" />
                        <div className="h-2 bg-white/10 w-1/4 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-md mx-auto p-4 h-full flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                            {unreadCount}
                        </span>
                    )}
                </h1>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="text-xs text-primary font-bold uppercase tracking-wider hover:underline"
                    >
                        Mark all as read
                    </button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                {loading && notifications.length === 0 ? (
                    renderSkeletons()
                ) : (
                    <AnimatePresence mode="popLayout">
                        {notifications.length > 0 ? notifications.map((n) => (
                            <motion.div
                                key={n.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onClick={() => !n.isRead && markRead(n.id)}
                                className={`p-4 rounded-xl flex gap-4 items-center transition-all cursor-pointer hover:bg-primary/5 group ${n.isRead ? 'opacity-60' : 'bg-primary/[0.03] shadow-sm'}`}
                            >
                                <img
                                    src={n.actor?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.username}`}
                                    className="w-10 h-10 rounded-full bg-secondary/10 object-cover border border-secondary/10"
                                    alt=""
                                />
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-bold">{n.actor?.displayName}</span>
                                        {n.type === 'new_follower' && ' started following you'}
                                        {n.type === 'playlist_invite' && ' invited you to collaborate'}
                                        {n.type === 'recommendation' && ' shared a recommendation'}
                                    </p>
                                    <p className="text-[10px] text-secondary mt-1 font-medium">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                {!n.isRead && (
                                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />
                                )}
                            </motion.div>
                        )) : (
                            <div className="text-center py-20 flex flex-col items-center">
                                <div className="w-16 h-16 bg-secondary/5 rounded-full flex items-center justify-center mb-4 text-secondary/30">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                </div>
                                <h3 className="font-bold text-lg">All caught up!</h3>
                                <p className="text-sm text-secondary">No new notifications at the moment.</p>
                            </div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
