import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import SearchSection from './components/SearchSection';
import MusicContext from './context/MusicContext';
import useMusicPlayer from './hooks/useMusicPlayer';
import AlbumDetails from './pages/AlbumDetails';
import ArtistPage from './pages/ArtistPage';
import Home from './pages/Home';
import PlaylistPage from './pages/PlaylistPage';

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
                    <Route path="/albums/:id" element={<AlbumDetails />} />
                    <Route path="/artists/:id" element={<ArtistPage />} />
                    <Route path="/playlists/:id" element={<PlaylistPage />} />
                </Routes>
            </BrowserRouter>
            {currentSong && <Player />}
        </MusicContext.Provider>
    );
}
