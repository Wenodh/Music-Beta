import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { motion, AnimatePresence } from 'framer-motion';
import { store, persistor } from './store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { setAccentColor, showToast, removeToast, closePlaylistModal, setEqualizerOpen, setPlayerExpanded, setLyricsOpen, setSessionModalOpen } from './features/ui/uiSlice';
import { setUser } from './features/auth/authSlice';
import { setCurrentTime, nextSong, prevSong, playMusic, pauseMusic, setRecommendations, setQueueOpen, setSongRadioEnabled, setVisualizerStyle, toggleRepeatMode, toggleShuffle, applyMusicPlayerSettings, addToHistory, updateHistoryDuration } from './features/musicplayer/musicPlayerSlice';
import { syncLibrary, toggleFavoriteCloud } from './features/library/libraryActions';
import { setDownloadedIds } from './features/library/librarySlice';
import { joinSession } from './features/session/sessionSlice';
import { supabase } from './lib/supabase';
import { getOfflineSongs } from './utils/db';
import { hexToRgb } from './utils/colorUtils';
import { historyService } from './lib/history/HistoryService';
import { sleepTimerService } from './lib/playback/SleepTimerService';
import { syncManager } from './lib/sync/SyncManager';
import { StorageService } from './lib/storage/StorageService';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import BottomBar from './components/BottomBar';
import Player from './components/Player';
import MiniPlayer from './components/MiniPlayer';
import SearchSection from './components/SearchSection';
import ToastContainer from './components/toast/ToastContainer';
import ScrollToTop from './components/ScrollToTop';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useSyncAndDownloads } from './hooks/useSyncAndDownloads';
import SocialOnboarding from './features/social/components/SocialOnboarding';

// Wrapper for lazy components with retry logic
const lazyRetry = (componentImport: any) =>
    lazy(async () => {
        try {
            return await componentImport();
        } catch (error) {
            console.error('Error loading chunk:', error);
            window.location.reload();
            return { default: () => null };
        }
    });

// Lazy load pages
const Home = lazyRetry(() => import('./pages/Home'));
const Explore = lazyRetry(() => import('./pages/Explore'));
const AlbumDetails = lazyRetry(() => import('./pages/AlbumDetails'));
const ArtistPage = lazyRetry(() => import('./pages/ArtistPage'));
const PlaylistPage = lazyRetry(() => import('./pages/PlaylistPage'));
const Library = lazyRetry(() => import('./pages/Library'));
const Search = lazyRetry(() => import('./pages/Search'));
const SongGlobe = lazyRetry(() => import('./pages/SongGlobe'));
const PrivacyPolicy = lazyRetry(() => import('./pages/PrivacyPolicy'));
const MediaDetails = lazyRetry(() => import('./pages/MediaDetails'));
const MediaPersonPage = lazyRetry(() => import('./pages/MediaPersonPage'));
const Diagnostics = lazyRetry(() => import('./pages/Diagnostics'));
const DownloadsPage = lazyRetry(() => import('./pages/Downloads'));
const ActivityFeed = lazyRetry(() => import('./features/social/components/ActivityFeed'));
const NotificationCenter = lazyRetry(() => import('./features/social/components/NotificationCenter'));
const ProfilePage = lazyRetry(() => import('./features/social/components/ProfilePage'));

// Lazy load UI components
const SettingsDrawer = lazyRetry(() => import('./components/SettingsDrawer'));
const Queue = lazyRetry(() => import('./components/Queue'));
const Equalizer = lazyRetry(() => import('./components/Equalizer'));
const Lyrics = lazyRetry(() => import('./components/Lyrics'));
const AddToPlaylistModal = lazyRetry(() => import('./components/modals/AddToPlaylistModal'));

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="will-change-opacity"
    >
        {children}
    </motion.div>
);

const AnimatedRoutes = () => {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                            <PageWrapper><Home /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/profile/:userId"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Profile...</div>}>
                            <PageWrapper><ProfilePage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/activity"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Activity...</div>}>
                            <PageWrapper><ActivityFeed /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/notifications"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Notifications...</div>}>
                            <PageWrapper><NotificationCenter /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/debug"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                            <PageWrapper><Diagnostics /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/diagnostics"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                            <PageWrapper><Diagnostics /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/podcasts/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Podcast...</div>}>
                            <PageWrapper><MediaDetails provider="podcast-index" type="podcast" /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/details/:provider/:type/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Details...</div>}>
                            <PageWrapper><MediaDetails /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/globe"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Song Globe...</div>}>
                            <PageWrapper><SongGlobe /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/search"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Search...</div>}>
                            <PageWrapper><Search /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/explore"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Explore...</div>}>
                            <PageWrapper><Explore /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/albums/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Album...</div>}>
                            <PageWrapper><AlbumDetails /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/library"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Library...</div>}>
                            <PageWrapper><Library /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/artists/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Artist...</div>}>
                            <PageWrapper><ArtistPage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/person/:provider/:type/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                            <PageWrapper><MediaPersonPage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/playlists/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Playlist...</div>}>
                            <PageWrapper><PlaylistPage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Profile...</div>}>
                            <PageWrapper><ProfilePage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/privacy"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                            <PageWrapper><PrivacyPolicy /></PageWrapper>
                        </Suspense>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
};

const LocationAwareNavbar = () => {
    const location = useLocation();
    const isSearchPage = location.pathname === '/search';
    return <Navbar isVisible={true} focusSearch={isSearchPage} />;
};

export const AppContent = () => {
    const dispatch = useAppDispatch();
    useSyncAndDownloads();
    const { user, isAuthenticated } = useAppSelector(state => state.auth);
    const socialProfile = useAppSelector(state => state.social.currentUserProfile);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user && (!socialProfile || !socialProfile.isOnboarded)) {
            setShowOnboarding(true);
        }
    }, [isAuthenticated, user, socialProfile]);

    const { toasts, playlistModal, isLyricsOpen, isPlayerExpanded, isEqualizerOpen, isSessionModalOpen, theme } = useAppSelector(state => state.ui);
    const { currentSong, isSettingsOpen, isQueueOpen } = useAppSelector(state => state.musicPlayer);
    const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);

    // Scroll Lock when overlays are open
    useEffect(() => {
        const shouldLock = isPlayerExpanded || isSettingsOpen || isQueueOpen || isEqualizerOpen || isLyricsOpen || playlistModal.isOpen || isSessionModalOpen;
        if (shouldLock) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isPlayerExpanded, isSettingsOpen, isQueueOpen, isEqualizerOpen, isLyricsOpen, playlistModal.isOpen, isSessionModalOpen]);

    useEffect(() => {
        // Initialize global services
        (window as any)._historyService = historyService;
        (window as any)._sleepTimerService = sleepTimerService;
        (window as any)._syncManager = syncManager;
        (window as any)._storageService = StorageService;

        // Handle direct room links
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room && room.length === 6) {
            dispatch(joinSession(room.toUpperCase()));
            // Clear the param from URL without refreshing
            const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({path:newurl},'',newurl);
        }

        // Sync Offline Downloads
        getOfflineSongs().then(songs => {
            const ids = songs.map(s => s.id);
            // Include new downloads from StorageService
            import('./lib/storage/StorageService').then(({ StorageService }) => {
                StorageService.getAllDownloads().then(downloads => {
                    const allIds = Array.from(new Set([...ids, ...downloads.map(d => d.id)]));
                    dispatch(setDownloadedIds(allIds));
                });
            });
        });

        // Supabase Auth Listener
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch(setUser(session?.user ?? null));
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            dispatch(setUser(session?.user ?? null));
            if (event === 'SIGNED_IN' && session?.user) {
                // Merge local library with cloud on sign in
                dispatch(syncLibrary({ merge: true }) as any);
            }
        });

        return () => subscription.unsubscribe();
    }, [dispatch]);

    useEffect(() => {
        if (!theme) return;

        if (theme.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (theme.isOled && theme.darkMode) {
            document.body.classList.add('oled-mode');
        } else {
            document.body.classList.remove('oled-mode');
        }
    }, [theme?.darkMode, theme?.isOled]);

    const getFontStyle = () => {
        switch (theme?.fontStyle) {
            case 'Bitcount Single': return "'Bitcount Single', cursive";
            case 'Black Ops One': return "'Black Ops One', cursive";
            case 'Bitcount Grid Double': return "'Bitcount Grid Double', cursive";
            case 'Croissant One': return "'Croissant One', cursive";
            default: return 'inherit';
        }
    };

    return (
        <div
            className={`dark:text-white min-h-screen font-sans selection:bg-primary selection:text-white pb-[var(--bottom-bar-height)] md:pb-24 transition-colors duration-500 ${theme?.isOled ? 'dark:!bg-black' : 'dark:bg-gray-950'}`}
            style={{
                '--accent-color': theme?.accentColor || '#ef4444',
                '--accent-rgb': hexToRgb(theme?.accentColor || '#ef4444'),
                '--bottom-bar-height': currentSong ? '150px' : '65px',
                paddingTop: 'var(--navbar-height, 80px)',
                fontFamily: getFontStyle()
            } as React.CSSProperties}
        >
                {showOnboarding && <SocialOnboarding onComplete={() => setShowOnboarding(false)} />}
                <LocationAwareNavbar />
                <BottomBar />
                <SearchSection />
                <main className="max-w-7xl mx-auto px-2 sm:px-4">
                    <AnimatePresence mode="wait">
                        <AnimatedRoutes />
                    </AnimatePresence>
                </main>
                <Player onShowMiniPlayer={() => setIsMiniPlayerOpen(true)} />
                <ScrollToTop />
                <AnimatePresence>
                    {isMiniPlayerOpen && <MiniPlayer onClose={() => setIsMiniPlayerOpen(false)} />}
                </AnimatePresence>

                <Suspense fallback={null}>
                    <SettingsDrawer />
                    <Queue />
                    <Equalizer />
                    <AddToPlaylistModal
                        song={playlistModal.song}
                        bulkSongs={playlistModal.bulkSongs}
                        onClose={() => dispatch(closePlaylistModal())}
                        onSuccess={(name: string) => dispatch(showToast({ message: `Added to ${name}` }))}
                        onError={(msg: string) => dispatch(showToast({ message: msg, type: 'error' }))}
                    />
                </Suspense>

                <ToastContainer
                    toasts={toasts}
                    removeToast={(id) => dispatch(removeToast(id))}
                />
        </div>
    );
};

export default function App() {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <BrowserRouter>
                        <AppContent />
                    </BrowserRouter>
                    <SpeedInsights />
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
}
