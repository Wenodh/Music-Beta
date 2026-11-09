import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSettingsOpen, setQueueOpen } from '../features/musicplayer/musicPlayerSlice';
import { ALL_MOBILE_NAV_ITEMS } from '../constants/navigation';
import { setIsFriendsModalOpen } from '../features/friends/friendsSlice';

const BottomBar: React.FC = () => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { theme, mobileNavItems, mobileNavPosition = 'bottom', isNavSettingsViewing } = useAppSelector((state) => state.ui);
    const { isSettingsOpen } = useAppSelector((state) => state.musicPlayer);
    const { unreadNotificationsCount } = useAppSelector((state) => state.social);

    // Map user-selected navigation items in user-configured custom order
    const visibleItems = React.useMemo(() => {
        const itemMap = new Map(ALL_MOBILE_NAV_ITEMS.map((item) => [item.id, item]));
        return mobileNavItems
            .map((id) => itemMap.get(id))
            .filter((item): item is typeof ALL_MOBILE_NAV_ITEMS[0] => item !== undefined);
    }, [mobileNavItems]);

    const handleNavClick = (item: typeof ALL_MOBILE_NAV_ITEMS[0], e: React.MouseEvent) => {
        dispatch(setSettingsOpen(false));
        dispatch(setQueueOpen(false));

        // When navigating anywhere via bottom bar, dismiss expanded now playing if open
        dispatch({ type: 'ui/setPlayerExpanded', payload: false });

        if (item.id === 'friends') {
            e.preventDefault();
            dispatch(setIsFriendsModalOpen(true));
        }
    };

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        if (path.includes('?')) {
            const [basePath, search] = path.split('?');
            return location.pathname === basePath && location.search === `?${search}`;
        }
        return location.pathname.startsWith(path) && !location.search;
    };

    const isVertical = mobileNavPosition === 'left' || mobileNavPosition === 'right';

    // Container position styling based on position option (Windows / Mac Dock style)
    const getContainerPositionClasses = () => {
        const zIndex = isNavSettingsViewing ? 'z-[380]' : 'z-[350]';
        switch (mobileNavPosition) {
            case 'top':
                return `fixed top-[calc(var(--navbar-height,56px)+6px)] left-0 right-0 ${zIndex} px-3 pointer-events-none`;
            case 'left':
                return `fixed left-2 top-1/2 -translate-y-1/2 ${zIndex} pointer-events-none`;
            case 'right':
                return `fixed right-2 top-1/2 -translate-y-1/2 ${zIndex} pointer-events-none`;
            case 'bottom-left':
                return `fixed bottom-0 left-0 ${zIndex} px-3 pb-3 pb-safe pointer-events-none`;
            case 'bottom-right':
                return `fixed bottom-0 right-0 ${zIndex} px-3 pb-3 pb-safe pointer-events-none`;
            case 'bottom':
            default:
                return `fixed bottom-0 left-0 right-0 ${zIndex} px-3 pb-3 pb-safe pointer-events-none`;
        }
    };

    const getDockClasses = () => {
        const base = `pointer-events-auto rounded-[22px] shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl border border-white/10 dark:border-white/5 relative overflow-hidden transition-all duration-300 ${
            theme.isOled ? 'bg-black/95' : 'bg-white/90 dark:bg-gray-950/90'
        }`;

        if (isVertical) {
            return `${base} flex flex-col items-center justify-around py-2 px-1 gap-1 w-14 max-h-[75vh]`;
        }

        if (mobileNavPosition === 'bottom-left' || mobileNavPosition === 'bottom-right') {
            return `${base} flex items-center justify-around px-2 py-1 max-w-xs`;
        }

        return `${base} flex items-center justify-around w-full max-w-md mx-auto px-0.5 py-1`;
    };

    if (isSettingsOpen && !isNavSettingsViewing) {
        return null;
    }

    return (
        <div className={`md:hidden ${getContainerPositionClasses()}`}>
            <div className={getDockClasses()}>
                {/* Premium subtle inner ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-30 pointer-events-none" />

                {visibleItems.map((item) => {
                    const ActiveIcon = item.activeIcon;
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            onClick={(e) => handleNavClick(item, e)}
                            className={`flex flex-col items-center justify-center relative group rounded-xl cursor-pointer select-none ${
                                isVertical ? 'w-11 py-2 my-0.5' : 'flex-1 py-1 min-w-0'
                            }`}
                            aria-label={item.label}
                        >
                            {/* Sliding dynamic active-pill background */}
                            {active && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}

                            <div className={`relative z-10 transition-all duration-300 ${active ? 'scale-105' : 'group-active:scale-95'}`}>
                                {active ? (
                                    <ActiveIcon className="w-[18px] h-[18px] xs:w-5 xs:h-5 text-primary drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.4)]" />
                                ) : (
                                    <div className="relative">
                                        <Icon className="w-[18px] h-[18px] xs:w-5 xs:h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                                        {item.id === 'friends' && unreadNotificationsCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <span
                                className={`relative z-10 text-[8px] xs:text-[9px] font-extrabold mt-0.5 uppercase tracking-wide transition-colors duration-300 truncate max-w-full px-0.5 ${
                                    active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                                } ${isVertical ? 'text-[7.5px] leading-tight' : ''}`}
                            >
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
