import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IoHomeOutline, IoHome, IoCompassOutline, IoCompass, IoLibraryOutline, IoLibrary, IoGlobeOutline, IoGlobe, IoPersonOutline, IoPerson } from 'react-icons/io5';
import { useAppSelector } from '../hooks/redux';

const navItems = [
    { label: 'Home', path: '/', icon: IoHomeOutline, activeIcon: IoHome },
    { label: 'Explore', path: '/explore', icon: IoCompassOutline, activeIcon: IoCompass },
    { label: 'Globe', path: '/globe', icon: IoGlobeOutline, activeIcon: IoGlobe },
    { label: 'Library', path: '/library', icon: IoLibraryOutline, activeIcon: IoLibrary },
    { label: 'Profile', path: '/profile', icon: IoPersonOutline, activeIcon: IoPerson },
];

const BottomBar: React.FC = () => {
    const location = useLocation();
    const { theme } = useAppSelector((state) => state.ui);

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] px-4 pb-3 pb-safe pointer-events-none">
            <div className={`pointer-events-auto flex items-center justify-around w-full max-w-md mx-auto px-1 py-1.5 rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-2xl border border-white/10 dark:border-white/5 relative overflow-hidden transition-colors duration-500 ${theme.isOled ? 'bg-black/95' : 'bg-white/85 dark:bg-gray-950/85'}`}>
                {/* Premium subtle inner ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-30 pointer-events-none" />

                {navItems.map((item) => {
                    const ActiveIcon = item.activeIcon;
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className="flex flex-col items-center justify-center py-1.5 relative group flex-1 rounded-2xl cursor-pointer select-none"
                            aria-label={item.label}
                        >
                            {/* Sliding dynamic active-pill background */}
                            {active && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}

                            <div className={`relative z-10 transition-all duration-300 ${active ? 'scale-110' : 'group-active:scale-95'}`}>
                                {active ? (
                                    <ActiveIcon className="w-5 h-5 xs:w-[22px] xs:h-[22px] text-primary drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.4)]" />
                                ) : (
                                    <Icon className="w-5 h-5 xs:w-[22px] xs:h-[22px] text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                                )}
                            </div>

                            <span className={`relative z-10 text-[9px] xs:text-[10px] font-bold mt-1 uppercase tracking-wider transition-colors duration-300 ${active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(BottomBar);
