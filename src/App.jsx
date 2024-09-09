import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import SearchSection from './components/SearchSection';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';
import { Provider } from 'react-redux';
import { persistor, store } from './store.js';
import { PersistGate } from 'redux-persist/integration/react';

const AlbumDetails = lazy(() => import('./pages/AlbumDetails'));
const ArtistPage = lazy(() => import('./pages/ArtistPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));

export default function App() {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <BrowserRouter>
                        <div className="dark:bg-gray-800 dark:text-white">
                            <Navbar />
                            <SearchSection />
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route
                                    path="/albums/:id"
                                    element={
                                        <Suspense
                                            fallback={<div>Loading...</div>}
                                        >
                                            <AlbumDetails />
                                        </Suspense>
                                    }
                                />
                                <Route
                                    path="/artists/:id"
                                    element={
                                        <Suspense
                                            fallback={<div>Loading...</div>}
                                        >
                                            <ArtistPage />
                                        </Suspense>
                                    }
                                />
                                <Route
                                    path="/playlists/:id"
                                    element={
                                        <Suspense
                                            fallback={<div>Loading...</div>}
                                        >
                                            <PlaylistPage />
                                        </Suspense>
                                    }
                                />
                            </Routes>
                            <Player />
                        </div>
                    </BrowserRouter>
                    <SpeedInsights />
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
}
