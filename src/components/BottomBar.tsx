import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoHomeOutline, IoHome, IoCompassOutline, IoCompass, IoSearchOutline, IoSearch, IoLibraryOutline, IoLibrary, IoPersonOutline, IoPerson } from 'react-icons/io5';
import { useAppSelector } from '../hooks/redux';

const BottomBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme } = useAppSelector((state) => state.ui);

    const navItems = [
        { label: 'Home', path: '/', icon: IoHomeOutline, activeIcon: IoHome },
        { label: 'Explore', path: '/explore', icon: IoCompassOutline, activeIcon: IoCompass },
        { label: 'Search', path: '/search', icon: IoSearchOutline, activeIcon: IoSearch }, // Assuming a /search route or handling search
        { label: 'Library', path: '/library', icon: IoLibraryOutline, activeIcon: IoLibrary },
        { label: 'Profile', path: '/profile', icon: IoPersonOutline, activeIcon: IoPerson },
    ];

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[200] px-4 pb-4 transition-all duration-500`}>
             <div className={`flex items-center justify-around p-2 rounded-[24px] shadow-2xl backdrop-blur-2xl border border-white/20 dark:border-white/10 ${theme.isOled ? 'bg-black/80' : 'bg-white/80 dark:bg-gray-900/80'}`}>
                {navItems.map((item) => {
                    const ActiveIcon = item.activeIcon;
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center p-2 relative group"
                        >
                            <div className={`transition-all duration-300 ${active ? 'scale-110' : 'group-active:scale-90'}`}>
                                {active ? (
                                    <ActiveIcon size={24} className="text-primary" />
                                ) : (
                                    <Icon size={24} className="text-gray-500 dark:text-gray-400" />
                                )}
                            </div>
                            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${active ? 'text-primary' : 'text-gray-500 dark:text-gray-400 opacity-0'}`}>
                                {item.label}
                            </span>
                            {active && (
                                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomBar;
