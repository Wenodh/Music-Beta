import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import BottomBar from './components/BottomBar';
import SearchSection from './components/SearchSection';
import { SpeedInsights } from '@vercel/speed-insights/react';
import ErrorBoundary from './components/ErrorBoundary';
import { Provider } from 'react-redux';
import { persistor, store } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { motion, AnimatePresence } from 'framer-motion';
import ToastContainer from './components/toast/ToastContainer';
import MiniPlayer from './components/MiniPlayer';
import { showToast, removeToast, closePlaylistModal, setLyricsOpen } from './features/ui/uiSlice';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { useState } from 'react';
import { getOfflineSongs } from './utils/db';
import { setDownloadedIds } from './features/library/librarySlice';
import { syncLibrary } from './features/library/libraryActions';
import { supabase } from './lib/supabase';
import { setUser } from './features/auth/authSlice';
import { joinSession } from './features/session/sessionSlice';
import { hexToRgb } from './utils/colorUtils';

const lazyRetry = (componentImport: () => Promise<any>) => {
    return lazy(async () => {
        try {
            return await componentImport();
        } catch (error) {
            // If the chunk load fails, try one reload
            console.error('Chunk load failed, reloading...', error);
            window.location.reload();
            return { default: () => null };
        }
    });
};

const Home = lazyRetry(() => import('./pages/Home'));
const Explore = lazyRetry(() => import('./pages/Explore'));
const AlbumDetails = lazyRetry(() => import('./pages/AlbumDetails'));
const ArtistPage = lazyRetry(() => import('./pages/ArtistPage'));
const PlaylistPage = lazyRetry(() => import('./pages/PlaylistPage'));
const Library = lazyRetry(() => import('./pages/Library'));
const Profile = lazyRetry(() => import('./pages/Profile'));
const Search = lazyRetry(() => import('./pages/Search'));
const PrivacyPolicy = lazyRetry(() => import('./pages/PrivacyPolicy'));

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
                            <PageWrapper><Profile /></PageWrapper>
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

import { useEffect } from 'react';

const LocationAwareNavbar = () => {
    const location = useLocation();
    const isSearchPage = location.pathname === '/search';
    return <Navbar isVisible={true} focusSearch={isSearchPage} />;
};

export const AppContent = () => {
    const dispatch = useAppDispatch();
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
            dispatch(setDownloadedIds(ids));
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

    return (
        <div
            className={`dark:text-white min-h-screen font-sans selection:bg-primary selection:text-white pt-28 md:pt-20 pb-[var(--bottom-bar-height)] md:pb-24 transition-colors duration-500 ${theme?.isOled ? 'dark:!bg-black' : 'dark:bg-gray-950'}`}
            style={{
                '--accent-color': theme?.accentColor || '#ef4444',
                '--accent-rgb': hexToRgb(theme?.accentColor || '#ef4444'),
                '--bottom-bar-height': currentSong ? '170px' : '80px'
            } as React.CSSProperties}
        >
            <BrowserRouter>
                <LocationAwareNavbar />
                <BottomBar />
                <SearchSection />
                <main className="max-w-7xl mx-auto px-2 sm:px-4">
                    <AnimatePresence mode="wait">
                        <AnimatedRoutes />
                    </AnimatePresence>
                </main>
                <Player onShowMiniPlayer={() => setIsMiniPlayerOpen(true)} />
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
            </BrowserRouter>
        </div>
    );
};

export default function App() {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <AppContent />
                    <SpeedInsights />
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
}
