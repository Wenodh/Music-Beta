import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setLanguage } from '../features/language/languageSlice';
import {
    setPreferredQuality,
    setSettingsOpen,
    setGaplessEnabled,
    setCrossfadeDuration,
    setWifiOnly,
    setMaxConcurrency,
} from '../features/musicplayer/musicPlayerSlice';
import {
    setEqualizerOpen,
    setAccentColor,
    setOledMode,
    showToast,
    setSessionModalOpen,
    setFontStyle,
    setImportExportModalOpen,
    setMobileNavItems,
    resetMobileNavItems,
    setMobileNavPosition,
    setProtectIpInCalls,
    setIsNavSettingsViewing,
    MobileNavPosition,
} from '../features/ui/uiSlice';
import { ALL_MOBILE_NAV_ITEMS } from '../constants/navigation';
import ThemeToggle from './ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoCloseOutline,
    IoLibraryOutline,
    IoSettingsOutline,
    IoMusicalNotesOutline,
    IoGlobeOutline,
    IoOptionsOutline,
    IoCloudDownloadOutline,
    IoTrashOutline,
    IoLogoGoogle,
    IoLogOutOutline,
    IoPersonOutline,
    IoSyncOutline,
    IoPeopleOutline,
    IoSwapHorizontalOutline,
    IoChatbubbleEllipsesOutline,
    IoCallOutline,
    IoChevronForwardOutline,
    IoShieldCheckmarkOutline,
    IoVolumeHighOutline,
    IoPlayOutline,
    IoStopOutline,
    IoRefreshOutline,
    IoSearchOutline,
    IoArrowBackOutline,
    IoColorPaletteOutline,
    IoInformationCircleOutline,
    IoServerOutline,
    IoCheckmarkCircleOutline,
} from 'react-icons/io5';
import { iceServerService } from '../services/webrtc/iceServerService';
import {
    soundService,
    AVAILABLE_RINGTONES,
    AVAILABLE_MESSAGE_SOUNDS,
    AVAILABLE_INVITE_SOUNDS,
    NotificationSoundPreferences,
} from '../services/soundService';
import { setIsFriendsModalOpen, setActiveFriendId } from '../features/friends/friendsSlice';
import { setSocialActiveTab, setActiveProfileView } from '../features/social/socialSlice';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signOut } from '../features/auth/authActions';
import { syncLibrary } from '../features/library/libraryActions';
import { getDownloadStorageInfo, deleteAllDownloads } from '../utils/db';
import { setDownloadedIds } from '../features/library/librarySlice';
import { useBackHandler } from '../hooks/useBackHandler';
import { backNavigationService } from '../services/backNavigationService';

export type SettingsCategoryId =
    | 'account'
    | 'audio'
    | 'downloads'
    | 'appearance'
    | 'sounds'
    | 'privacy'
    | 'data'
    | 'about';

interface CategoryDef {
    id: SettingsCategoryId;
    title: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string;
}

interface SearchableItem {
    id: string;
    categoryId: SettingsCategoryId;
    title: string;
    description: string;
    keywords: string[];
}

export const SETTINGS_CATEGORIES: CategoryDef[] = [
    {
        id: 'account',
        title: 'Account',
        description: 'Profile, cloud synchronization, quick social sessions',
        icon: IoPersonOutline,
    },
    {
        id: 'audio',
        title: 'Audio & Playback',
        description: 'Audio quality, gapless crossfade, equalizer preset',
        icon: IoMusicalNotesOutline,
    },
    {
        id: 'downloads',
        title: 'Downloads & Storage',
        description: 'Offline songs, Wi-Fi only, parallel download concurrency',
        icon: IoCloudDownloadOutline,
    },
    {
        id: 'appearance',
        title: 'Appearance & Interface',
        description: 'Themes, OLED black, accent colors, custom typography',
        icon: IoColorPaletteOutline,
    },
    {
        id: 'sounds',
        title: 'Sounds & Alerts',
        description: 'Ringtones, message alert tones, party invitation tones',
        icon: IoVolumeHighOutline,
    },
    {
        id: 'privacy',
        title: 'Privacy & Calling',
        description: 'IP protection, TURN relay-only, peer-to-peer security',
        icon: IoShieldCheckmarkOutline,
    },
    {
        id: 'data',
        title: 'Data Management',
        description: 'Mobile navigation dock placement, library import/export',
        icon: IoServerOutline,
    },
    {
        id: 'about',
        title: 'About',
        description: 'Version, developer info, privacy policy',
        icon: IoInformationCircleOutline,
    },
];

const SEARCHABLE_SETTINGS: SearchableItem[] = [
    {
        id: 'account-profile',
        categoryId: 'account',
        title: 'User Profile & Identity',
        description: 'View your profile, display name, avatar, and cloud sync status',
        keywords: ['account', 'profile', 'name', 'avatar', 'user', 'email'],
    },
    {
        id: 'account-sync',
        categoryId: 'account',
        title: 'Cloud Library Synchronization',
        description: 'Manually trigger library synchronization with your cloud account',
        keywords: ['sync', 'cloud', 'backup', 'restore', 'library'],
    },
    {
        id: 'account-shortcuts',
        categoryId: 'account',
        title: 'Direct Chat & Calling Shortcuts',
        description: 'Direct Friends Chat, Voice Call, and Group Listening Session access',
        keywords: ['friends', 'messages', 'chat', 'call', 'party', 'listening party', 'session'],
    },
    {
        id: 'audio-quality',
        categoryId: 'audio',
        title: 'Audio Quality Bitrate',
        description: 'Choose streaming and preferred audio quality (12kbps up to 320kbps)',
        keywords: ['quality', 'bitrate', 'audio', 'sound', '320kbps', '160kbps', 'stream'],
    },
    {
        id: 'audio-gapless',
        categoryId: 'audio',
        title: 'Gapless Playback (Crossfade)',
        description: 'Smooth crossfade transitions between songs (1 to 12 seconds)',
        keywords: ['gapless', 'crossfade', 'transition', 'fade', 'playback', 'seconds'],
    },
    {
        id: 'audio-equalizer',
        categoryId: 'audio',
        title: 'Sound Equalizer',
        description: 'Configure frequency bands, preamp gain, and audio presets',
        keywords: ['equalizer', 'eq', 'bass', 'treble', 'preset', 'bands', 'audio booster'],
    },
    {
        id: 'audio-language',
        categoryId: 'audio',
        title: 'Music Language Preference',
        description: 'Configure default language catalog (Telugu, Hindi, English, Tamil, Punjabi)',
        keywords: ['language', 'catalog', 'english', 'hindi', 'telugu', 'tamil', 'punjabi'],
    },
    {
        id: 'downloads-wifi',
        categoryId: 'downloads',
        title: 'Download over Wi-Fi Only',
        description: 'Conserve mobile cellular data by downloading only when connected to Wi-Fi',
        keywords: ['download', 'wifi', 'cellular', 'mobile data', 'offline'],
    },
    {
        id: 'downloads-concurrency',
        categoryId: 'downloads',
        title: 'Parallel Downloads Concurrency',
        description: 'Simultaneous active song downloads limit (1, 2, 3, 5, 10, 30, 60, 100)',
        keywords: ['parallel', 'concurrency', 'downloads', 'speed', 'queue', 'simultaneous'],
    },
    {
        id: 'downloads-storage',
        categoryId: 'downloads',
        title: 'Offline Storage Management',
        description: 'Inspect downloaded song storage footprint and clean up offline blobs',
        keywords: ['storage', 'offline', 'delete', 'cache', 'songs', 'disk', 'space'],
    },
    {
        id: 'appearance-theme',
        categoryId: 'appearance',
        title: 'Theme & OLED Dark Mode',
        description: 'Switch between Light, Dark, and true OLED pure black background',
        keywords: ['theme', 'dark mode', 'light mode', 'oled', 'black'],
    },
    {
        id: 'appearance-accent',
        categoryId: 'appearance',
        title: 'Accent Color',
        description: 'Custom primary accent colors (Red, Blue, Green, Purple, Pink, Orange)',
        keywords: ['accent', 'color', 'theme', 'palette', 'styling', 'tint'],
    },
    {
        id: 'appearance-font',
        categoryId: 'appearance',
        title: 'Font Typography Style',
        description: 'Select application typography (Standard, Bitcount, Lobster, Courgette, etc.)',
        keywords: ['font', 'typography', 'style', 'text', 'cursive', 'lobster', 'courgette'],
    },
    {
        id: 'sounds-master',
        categoryId: 'sounds',
        title: 'Master Sound Toggle',
        description: 'Enable or mute all in-app audio notification ringtones and alerts',
        keywords: ['sounds', 'mute', 'audio', 'alert', 'notifications', 'ringtone'],
    },
    {
        id: 'sounds-voice-ringtone',
        categoryId: 'sounds',
        title: 'Voice Call Ringtone',
        description: 'Continuous ringtone for incoming audio calls with live preview',
        keywords: ['ringtone', 'voice call', 'ringing', 'sound', 'modern', 'cyber', 'bell'],
    },
    {
        id: 'sounds-video-ringtone',
        categoryId: 'sounds',
        title: 'Video Call Ringtone',
        description: 'Distinguishable ringtone for incoming video requests with preview',
        keywords: ['video call', 'ringtone', 'cosmic', 'ringing', 'call'],
    },
    {
        id: 'sounds-messages',
        categoryId: 'sounds',
        title: 'Message Notification Tone',
        description: 'One-shot audio alert when receiving direct chat messages',
        keywords: ['message', 'chat', 'notification', 'tone', 'pop', 'droplet', 'ping'],
    },
    {
        id: 'sounds-invites',
        categoryId: 'sounds',
        title: 'Invitation Alert Tone',
        description: 'Audio chime for incoming listening party and social invites',
        keywords: ['invitation', 'party', 'invite', 'radiant', 'ambient', 'chime'],
    },
    {
        id: 'privacy-ip',
        categoryId: 'privacy',
        title: 'Protect IP Address in Calls (Relay Only)',
        description: 'Relay all peer-to-peer audio calls through TURN servers to conceal IP address',
        keywords: ['privacy', 'ip', 'protection', 'relay', 'turn', 'webrtc', 'p2p', 'calls', 'security'],
    },
    {
        id: 'privacy-policy',
        categoryId: 'privacy',
        title: 'Privacy Policy & Terms',
        description: 'Read our full privacy policy, data collection, and security practices',
        keywords: ['privacy', 'policy', 'terms', 'data', 'legal', 'security', 'protection'],
    },
    {
        id: 'data-navigation',
        categoryId: 'data',
        title: 'Navigation Dock Placement & Reordering',
        description: 'Customize mobile navigation bar items, order, and dock placement (Top, Bottom, Left, Right)',
        keywords: ['navigation', 'dock', 'bottom bar', 'dock placement', 'mobile', 'order', 'reorder'],
    },
    {
        id: 'data-portability',
        categoryId: 'data',
        title: 'Library Import & Export',
        description: 'Backup, restore, and convert your library via JSON, CSV, TXT, or M3U playlist files',
        keywords: ['import', 'export', 'backup', 'restore', 'portability', 'csv', 'json', 'm3u'],
    },
    {
        id: 'about-app',
        categoryId: 'about',
        title: 'About Vibe On & Privacy Policy',
        description: 'Application version, developer credits, and external privacy policy',
        keywords: ['about', 'version', 'developer', 'wenodh', 'privacy policy'],
    },
];

const SettingsDrawer: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // Redux selectors
    const { language } = useAppSelector((state) => state.language);
    const { theme, mobileNavItems, mobileNavPosition = 'bottom', protectIpInCalls } = useAppSelector((state) => state.ui);
    const { user, isAuthenticated, loading: authLoading } = useAppSelector((state) => state.auth);
    const { isSyncing, lastSynced } = useAppSelector((state) => state.library);
    const { preferredQuality, isSettingsOpen, equalizerSettings, isGaplessEnabled, crossfadeDuration, downloadSettings } = useAppSelector((state) => state.musicPlayer);

    // Navigation and UI state
    const [selectedCategory, setSelectedCategory] = useState<SettingsCategoryId>('account');
    const [mobileActiveCategory, setMobileActiveCategory] = useState<SettingsCategoryId | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedSettingId, setHighlightedSettingId] = useState<string | null>(null);

    // Expandable sections within categories (preserved drafts)
    const [isNavSettingsExpanded, setIsNavSettingsExpanded] = useState(false);
    const [isSoundSettingsExpanded, setIsSoundSettingsExpanded] = useState(false);
    const [storageInfo, setStorageInfo] = useState({ count: 0, totalSize: 0 });
    const [soundPrefs, setSoundPrefs] = useState<NotificationSoundPreferences>(soundService.getPreferences());
    const [previewingId, setPreviewingId] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const contentPanelRef = useRef<HTMLDivElement>(null);

    // Register BackNavigation handler:
    // If mobile sub-view is active, back returns to mobile category list.
    // Otherwise, closes the Settings Drawer.
    useBackHandler(isSettingsOpen, {
        id: 'settings-drawer-overlay',
        priority: mobileActiveCategory
            ? backNavigationService.PRIORITY.NESTED_SUB_VIEW
            : backNavigationService.PRIORITY.DRAWER_OR_PANEL,
        onBack: () => {
            if (mobileActiveCategory) {
                setMobileActiveCategory(null);
                return;
            }
            dispatch(setSettingsOpen(false));
        },
    });

    const accentColors = [
        { name: 'Red', value: '#ef4444' },
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Purple', value: '#a855f7' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Orange', value: '#f97316' },
    ];

    const fontStyles = [
        { name: 'Standard', value: 'Standard' },
        { name: 'Bitcount Single', value: 'Bitcount Single' },
        { name: 'Black Ops One', value: 'Black Ops One' },
        { name: 'Bitcount Grid Double', value: 'Bitcount Grid Double' },
        { name: 'Croissant One', value: 'Croissant One' },
        { name: 'Courgette', value: 'Courgette' },
        { name: 'Lobster', value: 'Lobster' },
        { name: 'Playwrite IT Trad', value: 'Playwrite IT Trad' },
        { name: 'Cursive', value: 'Dancing Script' },
    ];

    const languages = [
        { name: 'Telugu', value: 'telugu' },
        { name: 'Hindi', value: 'hindi' },
        { name: 'English', value: 'english' },
        { name: 'Tamil', value: 'tamil' },
        { name: 'Punjabi', value: 'punjabi' },
    ];

    const qualities = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];

    useEffect(() => {
        if (isSettingsOpen) {
            updateStorageInfo();
            setSoundPrefs(soundService.getPreferences());
        } else {
            soundService.stopPreview();
            setPreviewingId(null);
            setSearchQuery('');
            setMobileActiveCategory(null);
            setHighlightedSettingId(null);
            dispatch(setIsNavSettingsViewing(false));
        }
    }, [isSettingsOpen, dispatch]);

    // Keep track of whether user is currently viewing the navigation settings section
    useEffect(() => {
        if (!isSettingsOpen) {
            dispatch(setIsNavSettingsViewing(false));
            return;
        }

        // On mobile (<768px), nav settings are visible when mobileActiveCategory === 'data'
        // On desktop, nav settings are visible when selectedCategory === 'data'
        const isViewingNav = mobileActiveCategory === 'data' || (!mobileActiveCategory && selectedCategory === 'data');
        dispatch(setIsNavSettingsViewing(isViewingNav));

        return () => {
            dispatch(setIsNavSettingsViewing(false));
        };
    }, [isSettingsOpen, selectedCategory, mobileActiveCategory, dispatch]);

    const handleUpdateSoundPref = (updates: Partial<NotificationSoundPreferences>) => {
        const next = soundService.updatePreferences(updates);
        setSoundPrefs(next);
    };

    const handleRestoreDefaultSounds = () => {
        soundService.stopPreview();
        setPreviewingId(null);
        const restored = soundService.restoreDefaults();
        setSoundPrefs(restored);
        dispatch(showToast({ message: 'Restored default sound settings', type: 'info' }));
    };

    const handleTogglePreview = (soundId: string, category: 'ringtone' | 'message' | 'invitation') => {
        if (previewingId === soundId) {
            soundService.stopPreview();
            setPreviewingId(null);
        } else {
            soundService.previewSound(soundId, category);
            setPreviewingId(soundId);
        }
    };

    const updateStorageInfo = async () => {
        const info = await getDownloadStorageInfo();
        setStorageInfo(info);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatLastSynced = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const handleSync = useCallback(() => {
        dispatch(syncLibrary({ merge: true }) as any);
    }, [dispatch]);

    const handleDeleteAll = async () => {
        if (window.confirm('Delete all downloaded songs?')) {
            await deleteAllDownloads();
            dispatch(setDownloadedIds([]));
            updateStorageInfo();
            dispatch(showToast({ message: 'All downloads deleted' }));
        }
    };

    // Filter search results across all settings
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return SEARCHABLE_SETTINGS.filter((item) => {
            const inTitle = item.title.toLowerCase().includes(q);
            const inDesc = item.description.toLowerCase().includes(q);
            const inKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
            return inTitle || inDesc || inKeywords;
        });
    }, [searchQuery]);

    // Navigate to setting from search
    const handleSelectSearchResult = (item: SearchableItem) => {
        setSelectedCategory(item.categoryId);
        setMobileActiveCategory(item.categoryId);
        setHighlightedSettingId(item.id);
        setSearchQuery('');

        setTimeout(() => {
            const el = document.getElementById(item.id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    // Seamless navigation to Privacy Policy
    const handleViewPolicy = () => {
        dispatch(setSettingsOpen(false));
        navigate('/privacy');
        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } catch {
            window.scrollTo(0, 0);
        }
    };

    // Highlight text helper
    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <span>
                {parts.map((part, idx) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={idx} className="bg-primary/30 text-primary font-bold px-0.5 rounded">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    // Keyboard shortcut to focus search when drawer is open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isSettingsOpen) return;
            if (e.key === 'Escape') {
                if (searchQuery) {
                    setSearchQuery('');
                } else if (mobileActiveCategory) {
                    setMobileActiveCategory(null);
                } else {
                    dispatch(setSettingsOpen(false));
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSettingsOpen, searchQuery, mobileActiveCategory, dispatch]);

    // Active Category Content Renderer
    const renderCategoryContent = (categoryId: SettingsCategoryId) => {
        switch (categoryId) {
            case 'account':
                return (
                    <div className="space-y-6">
                        <div id="account-profile" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5">
                            {isAuthenticated && user ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={user.user_metadata?.avatar_url || '/vibeon-logo.png'}
                                            alt="Avatar"
                                            className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover"
                                        />
                                        <div
                                            className="overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                                            onClick={() => {
                                                navigate('/profile');
                                                dispatch(setSettingsOpen(false));
                                            }}
                                        >
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                {user.user_metadata?.full_name || 'Vibe User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            <span className="inline-block mt-0.5 text-[9px] font-bold text-primary">
                                                View Music Profile →
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={handleSync}
                                            disabled={isSyncing}
                                            className={`p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-colors ${
                                                isSyncing ? 'animate-spin' : ''
                                            }`}
                                            title="Sync Library"
                                        >
                                            <IoSyncOutline size={20} />
                                        </button>
                                        <button
                                            onClick={() => dispatch(signOut() as any)}
                                            className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                            title="Sign Out"
                                        >
                                            <IoLogOutOutline size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-3">
                                    <p className="text-xs text-gray-500 mb-3">Sign in with Google to sync your library across devices</p>
                                    <button
                                        onClick={() => dispatch(signInWithGoogle() as any)}
                                        disabled={authLoading}
                                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <IoLogoGoogle className="text-red-500" size={18} />
                                        {authLoading ? 'Connecting...' : 'Sign in with Google'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isAuthenticated && (
                            <div id="account-sync" className="px-2 flex justify-between items-center text-xs text-gray-500">
                                <span>Last Synced: {formatLastSynced(lastSynced)}</span>
                                {isSyncing && <span className="text-primary animate-pulse font-bold">Syncing...</span>}
                            </div>
                        )}

                        {/* Quick Actions Shortcuts */}
                        <div id="account-shortcuts" className="space-y-2 pt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Social Shortcuts</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        dispatch(setSettingsOpen(false));
                                        dispatch(setActiveFriendId(null));
                                        dispatch(setActiveProfileView(null));
                                        dispatch(setSocialActiveTab('chats'));
                                        dispatch(setIsFriendsModalOpen(true));
                                    }}
                                    className="flex items-center gap-2.5 p-3.5 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-all border border-primary/20 group text-left cursor-pointer"
                                >
                                    <div className="p-2 bg-primary/20 rounded-xl group-hover:scale-105 transition-transform text-primary">
                                        <IoChatbubbleEllipsesOutline size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-primary">Direct Chat</p>
                                        <p className="text-[10px] text-primary/70">Message friends</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        dispatch(setSettingsOpen(false));
                                        dispatch(setActiveFriendId(null));
                                        dispatch(setActiveProfileView(null));
                                        dispatch(setSocialActiveTab('calls'));
                                        dispatch(setIsFriendsModalOpen(true));
                                    }}
                                    className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl transition-all border border-emerald-500/20 group text-left cursor-pointer"
                                >
                                    <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:scale-105 transition-transform text-emerald-500">
                                        <IoCallOutline size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-500">Voice Call</p>
                                        <p className="text-[10px] text-emerald-500/70">P2P audio call</p>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    dispatch(setSettingsOpen(false));
                                    dispatch(setSessionModalOpen(true));
                                }}
                                className="w-full flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all group border border-gray-200 dark:border-white/10 cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-xl group-hover:scale-105 transition-transform">
                                        <IoPeopleOutline className="text-primary" size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">Listening Party</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Collaborative group session</p>
                                    </div>
                                </div>
                                <div className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200/60 dark:bg-white/10 group-hover:bg-primary text-gray-600 dark:text-gray-300 group-hover:text-white transition-all">
                                    <IoPeopleOutline size={14} />
                                </div>
                            </button>
                        </div>
                    </div>
                );

            case 'audio':
                return (
                    <div className="space-y-6">
                        {/* Audio Quality */}
                        <div id="audio-quality" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-gray-400">Preferred Audio Quality</h4>
                                    <p className="text-[10px] text-gray-500">Select streaming stream bitrate</p>
                                </div>
                                <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-lg">
                                    {preferredQuality}
                                </span>
                            </div>
                            <div className="relative pt-1">
                                <select
                                    value={preferredQuality}
                                    onChange={(e) => dispatch(setPreferredQuality(e.target.value as any))}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer shadow-sm pr-10"
                                >
                                    {qualities.map((q) => (
                                        <option key={q} value={q} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium">
                                            {q} {q === '320kbps' ? '(Very High)' : q === '160kbps' ? '(High)' : q === '96kbps' ? '(Medium)' : '(Low)'}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>

                        {/* Gapless Playback & Crossfade */}
                        <div id="audio-gapless" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Gapless (Crossfade)</p>
                                    <p className="text-[10px] text-gray-500">Smooth crossfade transitions between songs</p>
                                </div>
                                <button
                                    onClick={() => dispatch(setGaplessEnabled(!isGaplessEnabled))}
                                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${isGaplessEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <motion.div animate={{ x: isGaplessEnabled ? 20 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>

                            {isGaplessEnabled && (
                                <div className="pt-2">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Crossfade Duration</span>
                                        <span className="font-bold text-primary">{crossfadeDuration}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="12"
                                        value={crossfadeDuration}
                                        onChange={(e) => dispatch(setCrossfadeDuration(parseInt(e.target.value)))}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Equalizer Shortcut */}
                        <div id="audio-equalizer">
                            <button
                                onClick={() => {
                                    dispatch(setEqualizerOpen(true));
                                    dispatch(setSettingsOpen(false));
                                }}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                        <IoOptionsOutline size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Equalizer & Audio Booster</p>
                                        <p className="text-[10px] text-gray-500">
                                            {equalizerSettings.enabled ? equalizerSettings.preset : 'Disabled'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-xl">Configure →</span>
                            </button>
                        </div>

                        {/* Music Language */}
                        <div id="audio-language" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1.5">
                                        <IoGlobeOutline /> Music Language
                                    </h4>
                                    <p className="text-[10px] text-gray-500">Preferred music catalog recommendations</p>
                                </div>
                                <span className="text-xs font-bold text-primary uppercase">{language}</span>
                            </div>
                            <div className="relative pt-1">
                                <select
                                    value={language}
                                    onChange={(e) => dispatch(setLanguage(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer shadow-sm pr-10"
                                >
                                    {languages.map((lang) => (
                                        <option key={lang.value} value={lang.value} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium">
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>
                    </div>
                );

            case 'downloads':
                return (
                    <div className="space-y-6">
                        <div id="downloads-wifi" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Download over Wi-Fi only</p>
                                    <p className="text-[10px] text-gray-500">Save mobile cellular data</p>
                                </div>
                                <button
                                    onClick={() => dispatch(setWifiOnly(!downloadSettings.wifiOnly))}
                                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${downloadSettings.wifiOnly ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <motion.div animate={{ x: downloadSettings.wifiOnly ? 20 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>
                        </div>

                        {/* Parallel Downloads Concurrency */}
                        <div id="downloads-concurrency" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Parallel Downloads</p>
                                    <p className="text-[10px] text-gray-500">Simultaneous active downloads</p>
                                </div>
                                <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                                    {downloadSettings?.maxConcurrency ?? 3} active
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                {[1, 2, 3, 5, 10, 30, 60, 100].map((count) => {
                                    const active = (downloadSettings?.maxConcurrency ?? 3) === count;
                                    return (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => dispatch(setMaxConcurrency(count))}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                                                active
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-primary/50'
                                            }`}
                                        >
                                            {count}x
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Storage Footprint & Delete Action */}
                        <div id="downloads-storage" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        {storageInfo.count} offline songs
                                    </p>
                                    <p className="text-[10px] text-gray-500">
                                        Local device storage: {formatSize(storageInfo.totalSize)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteAll}
                                    disabled={storageInfo.count === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <IoTrashOutline /> Delete All Offline
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 italic">
                                Note: Deleting local offline downloads removes local cached audio blobs and will never delete remote favorite records from your account.
                            </p>
                        </div>
                    </div>
                );

            case 'appearance':
                return (
                    <div className="space-y-6">
                        {/* Theme & OLED Mode */}
                        <div id="appearance-theme" className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
                                    <p className="text-[10px] text-gray-500">Toggle light or dark appearance</p>
                                </div>
                                <ThemeToggle />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">OLED Mode</p>
                                    <p className="text-[10px] text-gray-500">True pure black background for OLED screens</p>
                                </div>
                                <button
                                    onClick={() => dispatch(setOledMode(!theme.isOled))}
                                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${theme.isOled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <motion.div animate={{ x: theme.isOled ? 20 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>
                        </div>

                        {/* Accent Colors */}
                        <div id="appearance-accent" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-400">Accent Color</h4>
                                <p className="text-[10px] text-gray-500">Personalize button and highlight tones</p>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-1">
                                {accentColors.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => dispatch(setAccentColor(color.value))}
                                        className={`w-9 h-9 rounded-full border-2 transition-all cursor-pointer ${
                                            theme.accentColor === color.value
                                                ? 'border-white ring-2 ring-primary scale-110 shadow-lg'
                                                : 'border-transparent hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Font Style */}
                        <div id="appearance-font" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-2">
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-400">Typography Font Style</h4>
                                <p className="text-[10px] text-gray-500">Customize application display font</p>
                            </div>
                            <div className="relative pt-1">
                                <select
                                    value={theme.fontStyle || 'Standard'}
                                    onChange={(e) => dispatch(setFontStyle(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer shadow-sm pr-10"
                                    style={{
                                        fontFamily: theme.fontStyle && theme.fontStyle !== 'Standard' ? `'${theme.fontStyle}', cursive` : 'inherit',
                                    }}
                                >
                                    {fontStyles.map((font) => (
                                        <option
                                            key={font.value}
                                            value={font.value}
                                            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                                            style={{
                                                fontFamily: font.value === 'Standard' ? 'inherit' : `'${font.value}', cursive`,
                                            }}
                                        >
                                            {font.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>
                    </div>
                );

            case 'sounds':
                return (
                    <div className="space-y-6">
                        {/* Master Sound Toggle */}
                        <div id="sounds-master" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Master Sound Toggle</p>
                                <p className="text-[10px] text-gray-500">Enable or mute all in-app alert sounds</p>
                            </div>
                            <button
                                onClick={() => handleUpdateSoundPref({ masterEnabled: !soundPrefs.masterEnabled })}
                                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${soundPrefs.masterEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <motion.div animate={{ x: soundPrefs.masterEnabled ? 20 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-0.5" />
                            </button>
                        </div>

                        {/* Incoming Voice Call Ringtone */}
                        <div id="sounds-voice-ringtone" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Voice Call Ringtone</p>
                                    <p className="text-[10px] text-gray-500">Continuous audio ringtone for incoming calls</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateSoundPref({ ringtoneEnabled: !soundPrefs.ringtoneEnabled })}
                                    className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${soundPrefs.ringtoneEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <motion.div animate={{ x: soundPrefs.ringtoneEnabled ? 16 : 2 }} className="w-3 h-3 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                {AVAILABLE_RINGTONES.map((tone) => {
                                    const isSelected = soundPrefs.voiceCallRingtone === tone.id;
                                    const isPlaying = previewingId === tone.id;
                                    return (
                                        <div
                                            key={tone.id}
                                            onClick={() => handleUpdateSoundPref({ voiceCallRingtone: tone.id })}
                                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-primary/20 border-primary text-gray-900 dark:text-white font-bold'
                                                    : 'bg-white dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-white/5 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <span>{tone.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTogglePreview(tone.id, 'ringtone');
                                                }}
                                                className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
                                                title={isPlaying ? 'Stop Preview' : 'Play Preview'}
                                            >
                                                {isPlaying ? <IoStopOutline size={14} className="text-primary animate-pulse" /> : <IoPlayOutline size={14} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Incoming Video Call Ringtone */}
                        <div id="sounds-video-ringtone" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Video Call Ringtone</p>
                                <p className="text-[10px] text-gray-500">Distinguishable chime for video requests</p>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                {AVAILABLE_RINGTONES.map((tone) => {
                                    const isSelected = soundPrefs.videoCallRingtone === tone.id;
                                    const isPlaying = previewingId === tone.id;
                                    return (
                                        <div
                                            key={tone.id}
                                            onClick={() => handleUpdateSoundPref({ videoCallRingtone: tone.id })}
                                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-primary/20 border-primary text-gray-900 dark:text-white font-bold'
                                                    : 'bg-white dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-white/5 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <span>{tone.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTogglePreview(tone.id, 'ringtone');
                                                }}
                                                className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
                                                title={isPlaying ? 'Stop Preview' : 'Play Preview'}
                                            >
                                                {isPlaying ? <IoStopOutline size={14} className="text-primary animate-pulse" /> : <IoPlayOutline size={14} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Direct Message Notification Sounds */}
                        <div id="sounds-messages" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Message Alert Sound</p>
                                    <p className="text-[10px] text-gray-500">One-shot sound on received chats</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateSoundPref({ messageEnabled: !soundPrefs.messageEnabled })}
                                    className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${soundPrefs.messageEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <motion.div animate={{ x: soundPrefs.messageEnabled ? 16 : 2 }} className="w-3 h-3 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                {AVAILABLE_MESSAGE_SOUNDS.map((tone) => {
                                    const isSelected = soundPrefs.messageSound === tone.id;
                                    const isPlaying = previewingId === tone.id;
                                    return (
                                        <div
                                            key={tone.id}
                                            onClick={() => handleUpdateSoundPref({ messageSound: tone.id })}
                                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-primary/20 border-primary text-gray-900 dark:text-white font-bold'
                                                    : 'bg-white dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-white/5 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <span>{tone.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTogglePreview(tone.id, 'message');
                                                }}
                                                className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
                                                title={isPlaying ? 'Stop Preview' : 'Play Preview'}
                                            >
                                                {isPlaying ? <IoStopOutline size={14} className="text-primary animate-pulse" /> : <IoPlayOutline size={14} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Group & Invitation Sounds */}
                        <div id="sounds-invites" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Invitation Tone</p>
                                    <p className="text-[10px] text-gray-500">Alert tone for listening party invites</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateSoundPref({ invitationEnabled: !soundPrefs.invitationEnabled })}
                                    className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${soundPrefs.invitationEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <motion.div animate={{ x: soundPrefs.invitationEnabled ? 16 : 2 }} className="w-3 h-3 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                {AVAILABLE_INVITE_SOUNDS.map((tone) => {
                                    const isSelected = soundPrefs.invitationSound === tone.id;
                                    const isPlaying = previewingId === tone.id;
                                    return (
                                        <div
                                            key={tone.id}
                                            onClick={() => handleUpdateSoundPref({ invitationSound: tone.id })}
                                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-primary/20 border-primary text-gray-900 dark:text-white font-bold'
                                                    : 'bg-white dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-white/5 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <span>{tone.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTogglePreview(tone.id, 'invitation');
                                                }}
                                                className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
                                                title={isPlaying ? 'Stop Preview' : 'Play Preview'}
                                            >
                                                {isPlaying ? <IoStopOutline size={14} className="text-primary animate-pulse" /> : <IoPlayOutline size={14} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Restore Defaults */}
                        <div className="pt-1 flex justify-end">
                            <button
                                type="button"
                                onClick={handleRestoreDefaultSounds}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all"
                            >
                                <IoRefreshOutline size={14} /> Restore Default Sounds
                            </button>
                        </div>
                    </div>
                );

            case 'privacy':
                return (
                    <div className="space-y-6">
                        <div id="privacy-ip" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <IoShieldCheckmarkOutline size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Protect IP Address in Calls</p>
                                        <p className="text-xs text-gray-500">
                                            Relays all WebRTC voice & video traffic through TURN servers, concealing your direct IP from peers
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const nextState = !protectIpInCalls;
                                        dispatch(setProtectIpInCalls(nextState));
                                        iceServerService.setForceRelay(nextState);
                                        dispatch(
                                            showToast({
                                                message: nextState
                                                    ? 'IP Protection enabled (Relay Only)'
                                                    : 'Standard P2P calls enabled',
                                                type: 'info',
                                            })
                                        );
                                    }}
                                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ml-2 ${
                                        protectIpInCalls ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                                    }`}
                                >
                                    <motion.div animate={{ x: protectIpInCalls ? 20 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>
                            <div className="p-3 bg-primary/5 rounded-xl text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                                <p className="font-semibold text-primary">Enforcement details:</p>
                                <p>• Applied immediately to all initial 1-on-1 and Group Listening calls via RTCPeerConnection.</p>
                                <p>• Disallows direct STUN host/srflx candidates, enforcing relay candidates only.</p>
                                <p>• Profile privacy settings (is_private, share_activity, show_online) can also be managed directly in Edit Profile.</p>
                            </div>
                        </div>

                        {/* Shortcut to Profile Privacy & Edit Profile */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Profile Privacy & Identity</p>
                                <p className="text-xs text-gray-500">Configure online visibility, activity sharing, and private account status</p>
                            </div>
                            <button
                                onClick={() => {
                                    dispatch(setSettingsOpen(false));
                                    navigate('/profile');
                                }}
                                className="px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
                            >
                                Open Profile →
                            </button>
                        </div>

                        {/* Privacy Policy & Terms Link in Privacy Category */}
                        <div id="privacy-policy" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Privacy Policy & Terms</p>
                                <p className="text-xs text-gray-500">Read our full privacy policy, data collection, and security practices</p>
                            </div>
                            <button
                                onClick={handleViewPolicy}
                                className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all"
                            >
                                View Policy →
                            </button>
                        </div>
                    </div>
                );

            case 'data':
                return (
                    <div className="space-y-6">
                        {/* Mobile Navigation Customizer */}
                        <div id="data-navigation" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Navigation Settings</h4>
                                    <p className="text-xs text-gray-500">Customize mobile navigation items and dock placement</p>
                                </div>
                                <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                                    {mobileNavItems.length} active
                                </span>
                            </div>

                            {/* Dock Placement Selector */}
                            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Dock Placement</p>
                                    <span className="text-[10px] text-primary uppercase font-bold">{mobileNavPosition}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { id: 'bottom', label: 'Bottom' },
                                        { id: 'top', label: 'Top' },
                                        { id: 'left', label: 'Left Dock' },
                                        { id: 'right', label: 'Right Dock' },
                                        { id: 'bottom-left', label: 'Bottom Left' },
                                        { id: 'bottom-right', label: 'Bottom Right' },
                                    ].map((pos) => {
                                        const isSelected = mobileNavPosition === pos.id;
                                        return (
                                            <button
                                                key={pos.id}
                                                type="button"
                                                onClick={() => dispatch(setMobileNavPosition(pos.id as MobileNavPosition))}
                                                className={`p-2 rounded-xl text-[11px] font-bold transition-all border ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 border-transparent'
                                                }`}
                                            >
                                                {pos.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Item Toggles and Reorder */}
                            <div className="flex items-center justify-between pt-1">
                                <p className="text-xs font-medium text-gray-400">Navigation destinations:</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        dispatch(resetMobileNavItems());
                                        dispatch(showToast({ message: 'Navigation reset to default' }));
                                    }}
                                    className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                    Restore Default Order
                                </button>
                            </div>

                            <div className="space-y-2">
                                {(() => {
                                    // Order items: active items sorted by user custom order in mobileNavItems, then inactive items
                                    const itemMap = new Map(ALL_MOBILE_NAV_ITEMS.map((item) => [item.id, item]));
                                    const activeItems = mobileNavItems
                                        .map((id) => itemMap.get(id))
                                        .filter((item): item is typeof ALL_MOBILE_NAV_ITEMS[0] => item !== undefined);
                                    const inactiveItems = ALL_MOBILE_NAV_ITEMS.filter((item) => !mobileNavItems.includes(item.id));
                                    const orderedItems = [...activeItems, ...inactiveItems];

                                    return orderedItems.map((item) => {
                                        const Icon = item.icon;
                                        const currentIndex = mobileNavItems.indexOf(item.id);
                                        const isEnabled = currentIndex !== -1;

                                        const handleToggle = () => {
                                            if (!item.isRemovable) {
                                                dispatch(showToast({ message: 'Home is required for navigation', type: 'info' }));
                                                return;
                                            }
                                            if (isEnabled) {
                                                if (mobileNavItems.length <= 2) {
                                                    dispatch(showToast({ message: 'Minimum 2 navigation destinations required', type: 'error' }));
                                                    return;
                                                }
                                                dispatch(setMobileNavItems(mobileNavItems.filter((id) => id !== item.id)));
                                            } else {
                                                dispatch(setMobileNavItems([...mobileNavItems, item.id]));
                                            }
                                        };

                                        const handleMoveUp = () => {
                                            if (currentIndex <= 0) return;
                                            const nextItems = [...mobileNavItems];
                                            const temp = nextItems[currentIndex - 1];
                                            nextItems[currentIndex - 1] = nextItems[currentIndex];
                                            nextItems[currentIndex] = temp;
                                            dispatch(setMobileNavItems(nextItems));
                                        };

                                        const handleMoveDown = () => {
                                            if (currentIndex === -1 || currentIndex >= mobileNavItems.length - 1) return;
                                            const nextItems = [...mobileNavItems];
                                            const temp = nextItems[currentIndex + 1];
                                            nextItems[currentIndex + 1] = nextItems[currentIndex];
                                            nextItems[currentIndex] = temp;
                                            dispatch(setMobileNavItems(nextItems));
                                        };

                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-white/5"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                                {item.label}
                                                            </p>
                                                            {isEnabled && (
                                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold">
                                                                    #{currentIndex + 1}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 truncate">{item.description}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                    {/* Accessible Move Up / Down Buttons */}
                                                    {isEnabled && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={handleMoveUp}
                                                                disabled={currentIndex <= 0}
                                                                className="p-1 rounded-md bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold"
                                                                title="Move Up"
                                                                aria-label={`Move ${item.label} Up`}
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleMoveDown}
                                                                disabled={currentIndex >= mobileNavItems.length - 1}
                                                                className="p-1 rounded-md bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold"
                                                                title="Move Down"
                                                                aria-label={`Move ${item.label} Down`}
                                                            >
                                                                ▼
                                                            </button>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleToggle}
                                                        disabled={!item.isRemovable}
                                                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                                                            !item.isRemovable
                                                                ? 'opacity-50 cursor-not-allowed bg-primary'
                                                                : isEnabled
                                                                ? 'bg-primary'
                                                                : 'bg-gray-300 dark:bg-gray-700'
                                                        }`}
                                                    >
                                                        <motion.div animate={{ x: isEnabled ? 18 : 2 }} className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* Import & Export */}
                        <div id="data-portability" className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5">
                            <button
                                onClick={() => {
                                    dispatch(setSettingsOpen(false));
                                    dispatch(setImportExportModalOpen(true));
                                }}
                                className="w-full flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                        <IoSwapHorizontalOutline size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Import & Export Library</p>
                                        <p className="text-[10px] text-gray-500">Backup, restore or convert CSV, JSON, TXT, M3U playlists</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-xl">Open →</span>
                            </button>
                        </div>
                    </div>
                );

            case 'about':
                return (
                    <div className="space-y-6 text-center">
                        <div id="about-app" className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-4">
                            <img src="/vibeon-logo.png" alt="Vibe On" className="w-16 h-16 mx-auto rounded-2xl shadow-md" />
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Vibe On</h3>
                                <p className="text-xs text-gray-400">Version 1.3.1 (Build 6)</p>
                            </div>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                Premium high-fidelity music streaming, lossless offline playback, social layer, and listening parties.
                            </p>
                            <div className="pt-2 flex justify-center">
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <img src="/developer-photo.webp" alt="WENODH" className="w-5 h-5 rounded-full object-cover" />
                                    <p className="text-xs text-gray-500 font-medium">
                                        Made with ❤️ by <span className="font-bold text-primary">WENODH</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-white/5 flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Privacy Policy & Terms</p>
                                <p className="text-xs text-gray-500">Read our data protection commitments</p>
                            </div>
                            <button
                                onClick={handleViewPolicy}
                                className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all"
                            >
                                View Policy →
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(setSettingsOpen(false))}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[360]"
                    />

                    {/* Dual-Pane Drawer Container */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className={`fixed right-0 top-0 bottom-0 w-full md:w-[720px] lg:w-[820px] max-w-full bg-white shadow-2xl z-[370] flex flex-col ${
                            theme.isOled ? 'dark:bg-black' : 'dark:bg-gray-900'
                        }`}
                    >
                        {/* Drawer Header */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                    <IoSettingsOutline size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        Settings
                                    </h2>
                                    <p className="text-[11px] text-gray-400 hidden sm:block">
                                        Control Center & Preferences
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => dispatch(setSettingsOpen(false))}
                                    aria-label="Close settings"
                                    className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <IoCloseOutline size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Global Search Bar */}
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="relative">
                                <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search all settings (e.g., quality, crossfade, wifi, turn relay, fonts)..."
                                    className="w-full pl-10 pr-9 py-2 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    >
                                        <IoCloseOutline size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search Results Dropdown Overlay (Instant filter across all categories) */}
                        {searchQuery.trim().length > 0 ? (
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                                <div className="flex items-center justify-between px-1 text-xs text-gray-400">
                                    <span>
                                        Matching Results ({searchResults.length}) for "{searchQuery}"
                                    </span>
                                    <button onClick={() => setSearchQuery('')} className="text-primary hover:underline font-medium">
                                        Clear Search
                                    </button>
                                </div>
                                {searchResults.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 space-y-2">
                                        <IoSearchOutline size={36} className="mx-auto opacity-40" />
                                        <p className="text-sm font-semibold">No matching settings found</p>
                                        <p className="text-xs">Try searching for keywords like "audio", "offline", "theme", or "relay".</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {searchResults.map((item) => {
                                            const catDef = SETTINGS_CATEGORIES.find((c) => c.id === item.categoryId);
                                            const Icon = catDef?.icon || IoSettingsOutline;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleSelectSearchResult(item)}
                                                    className="w-full p-4 bg-gray-50 dark:bg-gray-800/60 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-2xl border border-gray-200/60 dark:border-white/5 transition-all text-left flex items-start gap-3 group cursor-pointer"
                                                >
                                                    <div className="p-2.5 bg-white dark:bg-gray-700/80 rounded-xl text-primary group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                                {highlightMatch(item.title, searchQuery)}
                                                            </p>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0 ml-2">
                                                                {catDef?.title}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                            {highlightMatch(item.description, searchQuery)}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Normal Categorized Experience: Desktop Dual-Pane (>= 768px) & Mobile Drill-in (< 768px) */
                            <div className="flex-1 flex overflow-hidden">
                                {/* Desktop Sidebar (Hidden on mobile < 768px) */}
                                <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-3 space-y-1 shrink-0 bg-gray-50/40 dark:bg-black/20">
                                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Categories
                                    </div>
                                    {SETTINGS_CATEGORIES.map((cat) => {
                                        const Icon = cat.icon;
                                        const isSelected = selectedCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => {
                                                    setSelectedCategory(cat.id);
                                                    setHighlightedSettingId(null);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <Icon size={18} className={isSelected ? 'text-white' : 'text-primary'} />
                                                <span className="truncate flex-1">{cat.title}</span>
                                            </button>
                                        );
                                    })}
                                </aside>

                                {/* Desktop Content Panel */}
                                <main
                                    ref={contentPanelRef}
                                    className="hidden md:block flex-1 overflow-y-auto p-6 space-y-6"
                                >
                                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                                        <div>
                                            <h3 className="text-base font-black text-gray-900 dark:text-white">
                                                {SETTINGS_CATEGORIES.find((c) => c.id === selectedCategory)?.title}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {SETTINGS_CATEGORIES.find((c) => c.id === selectedCategory)?.description}
                                            </p>
                                        </div>
                                    </div>
                                    {renderCategoryContent(selectedCategory)}
                                </main>

                                {/* Mobile Drill-in Navigation (< 768px) */}
                                <div className="md:hidden flex-1 flex flex-col overflow-hidden">
                                    {mobileActiveCategory === null ? (
                                        /* Category List Screen on Mobile */
                                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                                            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                                Select a Category
                                            </div>
                                            {SETTINGS_CATEGORIES.map((cat) => {
                                                const Icon = cat.icon;
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setMobileActiveCategory(cat.id)}
                                                        className="w-full flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-white/5 transition-all text-left cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                                                <Icon size={18} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                                    {cat.title}
                                                                </p>
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                                    {cat.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <IoChevronForwardOutline size={18} className="text-gray-400 shrink-0 ml-2" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Mobile Dedicated Settings Screen */
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                                                <button
                                                    onClick={() => setMobileActiveCategory(null)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80 py-1"
                                                >
                                                    <IoArrowBackOutline size={18} />
                                                    <span>Back to Categories</span>
                                                </button>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {SETTINGS_CATEGORIES.find((c) => c.id === mobileActiveCategory)?.title}
                                                </span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 pb-safe pb-32 space-y-6">
                                                {renderCategoryContent(mobileActiveCategory)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SettingsDrawer;
