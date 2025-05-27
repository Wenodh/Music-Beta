import { useEffect } from 'react';
import Slider from './Slider';
import { useDispatch, useSelector } from 'react-redux';
import { setSongs } from '../features/musicplayer/musicPlayerSlice';
import {
    useGetHomeAlbumsQuery,
    useGetHomeTrendingSongsQuery,
    useGetHomeTopPlaylistsQuery,
    useGetHomeArtistsQuery,
} from '../features/api/apiSlice';

const MainSection = () => {
    const dispatch = useDispatch();
    const language = useSelector((state) => state.language); // Corrected language selector
    const recentlyPlayedSongs = useSelector(
        (state) => state.musicPlayer.recentlyPlayed
    );

    const { data: albums, isLoading: albumsLoading, isError: albumsError } = useGetHomeAlbumsQuery({ language, page: 1, limit: 10 });
    const { data: trendingSongsData, isLoading: trendingLoading, isError: trendingError } = useGetHomeTrendingSongsQuery({ language, page: 1, limit: 10 });
    const { data: playlists, isLoading: playlistsLoading, isError: playlistsError } = useGetHomeTopPlaylistsQuery(language);
    const { data: artists, isLoading: artistsLoading, isError: artistsError } = useGetHomeArtistsQuery(language);
    // useEffect(() => {
    //     if (trendingSongsData && trendingSongsData?.[0]?.type === 'song') {
    //         dispatch(setSongs(trendingSongsData));
    //     }
    // }, [trendingSongsData, dispatch]);

    // Optional: Combined loading/error state for simplicity
    if (albumsLoading || trendingLoading || playlistsLoading || artistsLoading) {
        return <div className="py-24 min-h-screen text-center">Loading homepage data...</div>;
    }

    // Optional: Basic error handling (can be more granular)
    // if (albumsError || trendingError || playlistsError || artistsError) {
    //     console.log(albumsError ,trendingError , playlistsError , artistsError)
    //     return <div className="py-24 min-h-screen text-center">Error loading data. Please try again later.</div>;
    // }

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
            <Slider data={trendingSongsData || []} /> {/* Use trendingSongsData and provide fallback */}
            <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                Top Albums
            </h2>
            <Slider data={albums || []} /> {/* Provide fallback for albums */}
            {(playlists && playlists.length > 0) && ( /* Check playlists data */
                <>
                    <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Top Playlist
                    </h2>
                    <Slider data={playlists} />
                </>
            )}
            {(artists && artists.length > 0) && ( /* Check artists data */
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
