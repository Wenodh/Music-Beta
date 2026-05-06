import React from 'react';
import useFetchDetails from '../hooks/useFetchDetails';
import ImageComponent from './ImageComponent';
import FlexLayout from './FlexLayout';
import SongsList from './SongsList';
import Slider from './Slider';
import { useAppDispatch } from '../hooks/redux';
import { setSongs } from '../features/musicplayer/musicPlayerSlice';
import { useEffect } from 'react';

interface PageTemplateProps {
    apiUrl: string;
    getImageUrl: (data: any) => string;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ apiUrl, getImageUrl }) => {
    const { details, loading, error, image } = useFetchDetails(apiUrl, getImageUrl);
    const dispatch = useAppDispatch();

    const songs = details?.songs || details?.topSongs || [];

    useEffect(() => {
        if (songs.length > 0) {
            dispatch(setSongs(songs));
        }
    }, [songs, dispatch]);

    if (loading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="p-10 text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
                Retry
            </button>
        </div>
    );

    return (
        <div className="p-5 pb-32 max-w-7xl mx-auto">
            <FlexLayout>
                <div className="flex flex-col items-center lg:items-start lg:sticky lg:top-24 h-fit">
                    <div className="relative group">
                        <ImageComponent src={image} alt={details?.name || 'Album/Artist'} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                                <span className="text-3xl">▶</span>
                            </button>
                        </div>
                    </div>
                    <h1 className="text-3xl font-black mt-6 text-center lg:text-left leading-tight">{details?.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center lg:text-left font-medium">
                        {Array.isArray(details?.artists)
                            ? details.artists.map((a: any) => a.name).join(', ')
                            : details?.primaryArtists || (typeof details?.artists === 'object' ? (details.artists.primary?.map((a: any) => a.name).join(', ')) : details?.artists)}
                    </p>
                    {details?.songCount && (
                        <p className="text-sm text-gray-400 mt-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{details.songCount} Songs</p>
                    )}
                </div>

                <div className="flex-1 w-full lg:pl-10 mt-10 lg:mt-0">
                    <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                        Songs
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{songs.length}</span>
                    </h2>
                    <div className="flex flex-col gap-1">
                        {songs.map((song: any) => (
                            <SongsList
                                key={song.id}
                                name={song.name}
                                artists={song.primaryArtists}
                                duration={song.duration}
                                downloadUrl={song.downloadUrl}
                                image={song.image}
                                id={song.id}
                                album={song.album || details}
                            />
                        ))}
                    </div>
                </div>
            </FlexLayout>

            {details?.topAlbums && (
                <div className="mt-20">
                    <Slider data={details.topAlbums} title="Top Albums" />
                </div>
            )}
        </div>
    );
};

export default PageTemplate;
