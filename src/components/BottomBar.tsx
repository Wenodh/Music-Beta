import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoHomeOutline, IoHome, IoCompassOutline, IoCompass, IoSearchOutline, IoSearch, IoLibraryOutline, IoLibrary, IoGlobeOutline, IoGlobe } from 'react-icons/io5';
import { useAppSelector } from '../hooks/redux';

const navItems = [
    { label: 'Home', path: '/', icon: IoHomeOutline, activeIcon: IoHome },
    { label: 'Explore', path: '/explore', icon: IoCompassOutline, activeIcon: IoCompass },
    { label: 'Globe', path: '/globe', icon: IoGlobeOutline, activeIcon: IoGlobe },
    { label: 'Library', path: '/library', icon: IoLibraryOutline, activeIcon: IoLibrary },
    { label: 'Search', path: '/search', icon: IoSearchOutline, activeIcon: IoSearch },
];

const BottomBar: React.FC = () => {
    const location = useLocation();
    const { theme } = useAppSelector((state) => state.ui);

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] pb-safe">
             <div className={`flex items-center justify-around px-2 py-1 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] backdrop-blur-3xl border-t border-white/10 dark:border-white/5 relative overflow-hidden ${theme.isOled ? 'bg-black' : 'bg-white/95 dark:bg-gray-950/95'}`}>
                {/* Futuristic inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-20" />

                {navItems.map((item) => {
                    const ActiveIcon = item.activeIcon;
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className="flex flex-col items-center justify-center py-2 relative group flex-1"
                            aria-label={item.label}
                        >
                            <div className={`relative transition-all duration-500 ${active ? 'scale-110' : 'group-active:scale-90 opacity-60'}`}>
                                {active && (
                                    <motion.div
                                        layoutId="icon-glow"
                                        className="absolute inset-0 blur-md bg-primary/30 rounded-full"
                                    />
                                )}
                                {active ? (
                                    <ActiveIcon size={26} className="text-primary relative z-10 drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />
                                ) : (
                                    <Icon size={24} className="text-gray-500 dark:text-gray-400 relative z-10" />
                                )}
                            </div>
                            <AnimatePresence>
                                {active && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="text-[10px] font-black mt-1 text-primary uppercase tracking-[0.15em] drop-shadow-[0_0_5px_rgba(var(--accent-rgb),0.4)]"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {active && (
                                <motion.div
                                    layoutId="bottom-nav-indicator"
                                    className="absolute -bottom-1 w-6 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--accent-rgb),1)]"
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(BottomBar);
