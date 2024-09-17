import { useParams } from 'react-router-dom';
import SongsList from '../components/SongsList';
import Slider from '../components/Slider';
import ImageComponent from '../components/ImageComponent';
import FlexLayout from '../components/FlexLayout';
import useFetchDetails from '../hooks/useFetchDetails';
import { useEffect } from 'react';

const PageTemplate = ({ apiUrl, getImageUrl }) => {
    const { id } = useParams();
    const { details, image, loading, error } = useFetchDetails(
        apiUrl,
        getImageUrl
    );
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);
    const songs = details?.songs || details?.topSongs || [];
    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    const renderSection = (title, list) => {
        return (
            list?.length > 0 && (
                <>
                    <h2 className="text-xl px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        {title}
                    </h2>
                    <Slider data={list} className="grid-rows-1 w-full" />
                </>
            )
        );
    };
    return (
        <div className="min-h-screen py-28 lg:py-20 mx-2 lg:mx-auto">
            <FlexLayout>
                <div>
                    <ImageComponent src={image} alt={details?.name} />
                    <div className="w-[250px] text-gray-600">
                        <h1>{details?.name}</h1>
                        <p>
                            {details?.artists?.primary?.[0]?.name
                                ? `by ${details?.artists?.primary?.[0]?.name}.`
                                : ''}
                            {details?.songCount
                                ? `${details?.songCount} songs`
                                : ''}
                        </p>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                    {songs?.map((song) => (
                        <SongsList key={song.id} {...song} />
                    ))}
                </div>
            </FlexLayout>
            {renderSection(
                'Artists',
                details?.artists?.all || details?.artists
            )}
            {renderSection('Albums', details?.topAlbums)}
            {renderSection('Similar Artists', details.similarArtists)}
        </div>
    );
};
export default PageTemplate;
