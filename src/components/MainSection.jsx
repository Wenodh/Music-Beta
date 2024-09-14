import { useState, useEffect } from 'react';
import axios from 'axios';
import Slider from './Slider';
import { album, playlistSearch, searchArtist, songs } from '../constants';
import { useDispatch, useSelector } from 'react-redux';
import { setSongs } from '../features/musicplayer/musicPlayerSlice';

const MainSection = () => {
    const [albums, setAlbums] = useState([]);
    const [trending, setTrending] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [artists, setArtists] = useState([]);
    const dispatch = useDispatch();
    const language = useSelector((state) => state.language);
    const recentlyPlayedSongs = useSelector(
        (state) => state.musicPlayer.recentlyPlayed
    );
    const getHomePageData = async () => {
        try {
            // Fetch albums
            const res = await axios.get(
                `${album}?query=${language}&page=0&limit=25`
            );
            const { data } = res.data;
            setAlbums(data.results);

            // Fetch trending songs
            const trendingSongs = await axios.get(
                `${songs}?query=${language}&page=0&limit=25`
            );
            setTrending(trendingSongs?.data?.data?.results || []);
            if (trendingSongs?.data?.data?.results?.[0]?.type === 'song') {
                dispatch(setSongs(trendingSongs?.data?.data?.results));
            }

            // Fetch top playlists
            const topPlaylists = await axios.get(
                `${playlistSearch}/${language}`
            );
            setPlaylists(topPlaylists?.data?.data?.results || []);
            const artistsData = await axios.get(`${searchArtist}/${language} singer`);
            setArtists(artistsData.data.data.results);
        } catch (error) {
            console.error('Error fetching homepage data:', error);
        }
    };

    useEffect(() => {
        getHomePageData();
    }, [language]);

    return (
        <section className="py-24 min-h-screen">
            {recentlyPlayedSongs?.length > 0 && (
                <>
                    <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Recently played(beta)
                    </h2>
                    <Slider
                        data={recentlyPlayedSongs}
                        className="md:grid-rows-1"
                    />
                </>
            )}
            <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                Trending Now
            </h2>
            <Slider data={trending} />
            <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                Top Albums
            </h2>
            <Slider data={albums} />
            {playlists.length > 0 && (
                <>
                    <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Top Playlist
                    </h2>
                    <Slider data={playlists} />
                </>
            )}
            {artists.length > 0 && (
                <>
                    <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Top Artists(coming soon)
                    </h2>
                    <Slider data={artists} />
                </>
            )}
        </section>
    );
};

export default MainSection;
