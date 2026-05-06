import React from 'react';
import useFetchDetails from '../hooks/useFetchDetails';
import ImageComponent from './ImageComponent';
import FlexLayout from './FlexLayout';
import SongsList from './SongsList';
import Slider from './Slider';

interface PageTemplateProps {
    apiUrl: string;
    getImageUrl: (data: any) => string;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ apiUrl, getImageUrl }) => {
    const { details, loading, error, image } = useFetchDetails(apiUrl, getImageUrl);

    if (loading) return <div className="p-5">Loading...</div>;
    if (error) return <div className="p-5 text-red-500">{error}</div>;

    const songs = details?.songs || details?.topSongs || [];

    const renderSlider = (title: string, list: any[]) => {
        if (!list || list.length === 0) return null;
        return (
            <div className="mt-8">
                <Slider data={list} title={title} />
            </div>
        );
    };

    return (
        <div className="p-5 pb-32">
            <FlexLayout>
                <div className="flex flex-col items-center lg:items-start">
                    <ImageComponent src={image} alt={details?.name || 'Album/Artist'} />
                    <h1 className="text-2xl font-bold mt-4">{details?.name}</h1>
                    <p className="text-gray-500">
                        {details?.artists?.map((a: any) => a.name).join(', ') || details?.artists}
                    </p>
                    {details?.songCount && (
                        <p className="text-sm text-gray-400">{details.songCount} Songs</p>
                    )}
                </div>

                <div className="flex-1 w-full">
                    <h2 className="text-xl font-semibold mb-4">Songs</h2>
                    <div className="flex flex-col gap-2">
                        {songs.map((song: any) => (
                            <SongsList
                                key={song.id}
                                name={song.name}
                                artists={song.primaryArtists}
                                duration={song.duration}
                                downloadUrl={song.downloadUrl}
                                image={song.image}
                                id={song.id}
                                album={song.album}
                            />
                        ))}
                    </div>
                </div>
            </FlexLayout>

            {renderSlider('Top Albums', details?.topAlbums)}
        </div>
    );
};

export default PageTemplate;
