import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
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
import ToastContainer from './components/toast/ToastContainer';
import AddToPlaylistModal from './components/modals/AddToPlaylistModal';
import { showToast, removeToast, closePlaylistModal } from './features/ui/uiSlice';
import { useAppSelector, useAppDispatch } from './hooks/redux';

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

export const AppContent = () => {
    const dispatch = useAppDispatch();
    const { toasts, playlistModal } = useAppSelector(state => state.ui);

    return (
        <div className="dark:bg-gray-950 dark:text-white min-h-screen font-sans selection:bg-red-500 selection:text-white pt-16 md:pt-20">
            <BrowserRouter>
                <Navbar />
                <SearchSection />
                <AnimatedRoutes />
                <Player />
                <SettingsDrawer />
                <Queue />
                <ToastContainer
                    toasts={toasts}
                    removeToast={(id) => dispatch(removeToast(id))}
                />
                <AddToPlaylistModal
                    song={playlistModal.song}
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
                    <AppContent />
                    <SpeedInsights />
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
}
