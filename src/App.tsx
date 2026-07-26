import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
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
import { showToast, removeToast, closePlaylistModal, setLyricsOpen, setEqualizerOpen, setPlayerExpanded, setSessionModalOpen } from './features/ui/uiSlice';
import { setSettingsOpen, setQueueOpen } from './features/musicplayer/musicPlayerSlice';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { getOfflineSongs } from './utils/db';
import { setDownloadedIds } from './features/library/librarySlice';
import { syncLibrary } from './features/library/libraryActions';
import { supabase } from './lib/supabase';
import { setUser } from './features/auth/authSlice';
import { joinSession } from './features/session/sessionSlice';
import { hexToRgb } from './utils/colorUtils';
import { Browser } from '@capacitor/browser';
import { Logger } from './lib/logger';

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
const SongGlobe = lazyRetry(() => import('./pages/SongGlobe'));
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

    const navigate = useNavigate();
    const location = useLocation();
    const navigationType = useNavigationType();

    // Use a ref to keep track of our in-app route history stack
    const historyStackRef = useRef<string[]>([location.pathname]);

    // Track the current state of overlays and routes in refs so the back-button listener callback
    // (which registers once) always has access to the most up-to-date state.
    const stateRef = useRef({
        pathname: location.pathname,
        isPlayerExpanded,
        isSettingsOpen,
        isQueueOpen,
        isEqualizerOpen,
        isLyricsOpen,
        playlistModalOpen: playlistModal.isOpen,
        isSessionModalOpen,
    });

    useEffect(() => {
        stateRef.current = {
            pathname: location.pathname,
            isPlayerExpanded,
            isSettingsOpen,
            isQueueOpen,
            isEqualizerOpen,
            isLyricsOpen,
            playlistModalOpen: playlistModal.isOpen,
            isSessionModalOpen,
        };
    }, [
        location.pathname,
        isPlayerExpanded,
        isSettingsOpen,
        isQueueOpen,
        isEqualizerOpen,
        isLyricsOpen,
        playlistModal.isOpen,
        isSessionModalOpen,
    ]);

    // Keep track of our route history
    useEffect(() => {
        const currentPath = location.pathname;
        const stack = historyStackRef.current;

        if (navigationType === 'PUSH') {
            stack.push(currentPath);
        } else if (navigationType === 'REPLACE') {
            if (stack.length > 0) {
                stack[stack.length - 1] = currentPath;
            } else {
                stack.push(currentPath);
            }
        } else if (navigationType === 'POP') {
            const index = stack.lastIndexOf(currentPath);
            if (index !== -1) {
                historyStackRef.current = stack.slice(0, index + 1);
            } else {
                // If the path was not in stack, treat it as the new root of the stack
                historyStackRef.current = [currentPath];
            }
        }
    }, [location.pathname, navigationType]);

    // Capacitor Native Android back button listener
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        let isMounted = true;
        let backListenerHandle: any = null;

        const registerListener = async () => {
            const handle = await CapApp.addListener('backButton', () => {
                const {
                    pathname,
                    isPlayerExpanded: playerOpen,
                    isSettingsOpen: settingsOpen,
                    isQueueOpen: queueOpen,
                    isEqualizerOpen: eqOpen,
                    isLyricsOpen: lyricsOpen,
                    playlistModalOpen: playlistOpen,
                    isSessionModalOpen: sessionOpen,
                } = stateRef.current;

                // 1. Close active overlays first (topmost to bottommost priority)
                if (playlistOpen) {
                    dispatch(closePlaylistModal());
                    return;
                }
                if (sessionOpen) {
                    dispatch(setSessionModalOpen(false));
                    return;
                }
                if (eqOpen) {
                    dispatch(setEqualizerOpen(false));
                    return;
                }
                if (lyricsOpen) {
                    dispatch(setLyricsOpen(false));
                    return;
                }
                if (queueOpen) {
                    dispatch(setQueueOpen(false));
                    return;
                }
                if (settingsOpen) {
                    dispatch(setSettingsOpen(false));
                    return;
                }
                if (playerOpen) {
                    dispatch(setPlayerExpanded(false));
                    return;
                }

                // 2. Route Navigation
                const stack = historyStackRef.current;
                if (stack.length > 1) {
                    // There is in-app history, so navigate back
                    navigate(-1);
                } else if (pathname !== '/') {
                    // Deep-linked fallback: no history and current page is not home, go to "/"
                    navigate('/', { replace: true });
                } else {
                    // Already at "/" and no history: allow app to exit
                    CapApp.exitApp();
                }
            });

            if (!isMounted) {
                handle.remove();
            } else {
                backListenerHandle = handle;
            }
        };

        registerListener();

        return () => {
            isMounted = false;
            if (backListenerHandle) {
                backListenerHandle.remove();
            }
        };
    }, [dispatch, navigate]);

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

    // Capacitor Native Android deep link listener for Google OAuth callbacks
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        let isMounted = true;
        let urlListenerHandle: any = null;

        const registerUrlListener = async () => {
            const handle = await CapApp.addListener('appUrlOpen', async (data) => {
                if (!isMounted) return;

                Logger.info('Deep link received by application', { url: data.url });

                try {
                    const parsedUrl = new URL(data.url);
                    const code = parsedUrl.searchParams.get('code');

                    if (code) {
                        Logger.info('Auth authorization code detected, executing token exchange.');
                        const { error } = await supabase.auth.exchangeCodeForSession(code);
                        if (error) {
                            Logger.error('OAuth code exchange failed', { error: error.message });
                        } else {
                            Logger.info('OAuth code exchange succeeded, session active!');
                        }

                        // Close the browser sheet overlay to bring user back into the app gracefully
                        await Browser.close().catch(err => {
                            Logger.warn('Error closing native browser sheet', { error: err instanceof Error ? err.message : String(err) });
                        });
                    }
                } catch (err) {
                    Logger.error('Error processing deep link payload', { error: err instanceof Error ? err.message : String(err) });
                }
            });

            if (!isMounted) {
                handle.remove();
            } else {
                urlListenerHandle = handle;
            }
        };

        registerUrlListener();

        return () => {
            isMounted = false;
            if (urlListenerHandle) {
                urlListenerHandle.remove();
            }
        };
    }, []);

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

        const handleOnline = () => {
            const state = store.getState();
            if (state.auth.user) {
                // Trigger silent library and settings sync on reconnect
                dispatch(syncLibrary({ merge: true, silent: true }) as any);
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
            subscription.unsubscribe();
        };
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
                '--bottom-bar-height': currentSong ? 'calc(148px + env(safe-area-inset-bottom))' : 'calc(70px + env(safe-area-inset-bottom))',
                '--player-pill-bottom': 'calc(70px + env(safe-area-inset-bottom))',
                paddingTop: 'var(--navbar-height, 80px)',
                fontFamily: getFontStyle()
            } as React.CSSProperties}
        >
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
