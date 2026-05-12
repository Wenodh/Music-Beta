import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Player from './components/Player';
import SearchSection from './components/SearchSection';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';
import { Provider } from 'react-redux';
import { persistor, store } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsDrawer from './components/SettingsDrawer';
import Queue from './components/Queue';
import Equalizer from './components/Equalizer';
import Lyrics from './components/Lyrics';
import ToastContainer from './components/toast/ToastContainer';
import AddToPlaylistModal from './components/modals/AddToPlaylistModal';
import MiniPlayer from './components/MiniPlayer';
import { showToast, removeToast, closePlaylistModal, setLyricsOpen } from './features/ui/uiSlice';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { useState } from 'react';

const AlbumDetails = lazy(() => import('./pages/AlbumDetails'));
const ArtistPage = lazy(() => import('./pages/ArtistPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));
const Library = lazy(() => import('./pages/Library'));

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
    >
        {children}
    </motion.div>
);

const AnimatedRoutes = () => {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
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
            </Routes>
        </AnimatePresence>
    );
};

import { useEffect } from 'react';

export const AppContent = () => {
    const dispatch = useAppDispatch();
    const { toasts, playlistModal, isLyricsOpen, theme } = useAppSelector(state => state.ui);
    const { currentSong } = useAppSelector(state => state.musicPlayer);
    const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);

    useEffect(() => {
        if (theme.darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme.darkMode]);

    return (
        <div
            className={`dark:text-white min-h-screen font-sans selection:bg-primary selection:text-white pt-28 md:pt-20 transition-colors duration-500 ${theme.isOled ? 'dark:!bg-black' : 'dark:bg-gray-950'}`}
            style={{ '--accent-color': theme.accentColor } as React.CSSProperties}
        >
            <BrowserRouter>
                <Navbar />
                <SearchSection />
                <main className="max-w-7xl mx-auto px-4">
                    <AnimatePresence mode="wait">
                        {isLyricsOpen ? (
                            <Lyrics
                                isOpen={isLyricsOpen}
                                onClose={() => dispatch(setLyricsOpen(false))}
                                songId={currentSong?.id || ''}
                                songName={currentSong?.name || ''}
                                artistName={currentSong?.primaryArtists || ''}
                            />
                        ) : (
                            <AnimatedRoutes />
                        )}
                    </AnimatePresence>
                </main>
                <Player onShowMiniPlayer={() => setIsMiniPlayerOpen(true)} />
                <AnimatePresence>
                    {isMiniPlayerOpen && <MiniPlayer onClose={() => setIsMiniPlayerOpen(false)} />}
                </AnimatePresence>
                <SettingsDrawer />
                <Queue />
                <Equalizer />
                <ToastContainer
                    toasts={toasts}
                    removeToast={(id) => dispatch(removeToast(id))}
                />
                <AddToPlaylistModal
                    song={playlistModal.song}
                    bulkSongs={playlistModal.bulkSongs}
                    onClose={() => dispatch(closePlaylistModal())}
                    onSuccess={(name) => dispatch(showToast({ message: `Added to ${name}` }))}
                    onError={(msg) => dispatch(showToast({ message: msg, type: 'error' }))}
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
                    <HelmetProvider>
                        <AppContent />
                        <SpeedInsights />
                    </HelmetProvider>
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
}
