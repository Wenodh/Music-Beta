import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import SearchSection from './components/SearchSection';
import MusicContext from './context/MusicContext';
import useMusicPlayer from './hooks/useMusicPlayer';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Home from './pages/Home';
import ErrorBoundary from './components/ErrorBoundary';

const AlbumDetails = lazy(() => import('./pages/AlbumDetails'));
const ArtistPage = lazy(() => import('./pages/ArtistPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));

export default function App() {
    const [searchedSongs, setSearchedSongs] = useState([]);

    const {
        songs,
        setSongs,
        playMusic,
        isPlaying,
        currentSong,
        nextSong,
        prevSong,
    } = useMusicPlayer([]);

    return (
        <ErrorBoundary>
            <MusicContext.Provider
                value={{
                    songs,
                    setSongs,
                    playMusic,
                    isPlaying,
                    currentSong,
                    nextSong,
                    prevSong,
                    setSearchedSongs,
                    searchedSongs,
                }}
            >
                <BrowserRouter>
                    <Navbar />
                    <SearchSection />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                            path="/albums/:id"
                            element={
                                <Suspense fallback={<div>Loading...</div>}>
                                    <AlbumDetails />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/artists/:id"
                            element={
                                <Suspense fallback={<div>Loading...</div>}>
                                    <ArtistPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/playlists/:id"
                            element={
                                <Suspense fallback={<div>Loading...</div>}>
                                    <PlaylistPage />
                                </Suspense>
                            }
                        />
                    </Routes>
                    {currentSong && <Player />}
                </BrowserRouter>
                <SpeedInsights />
            </MusicContext.Provider>
        </ErrorBoundary>
    );
}
