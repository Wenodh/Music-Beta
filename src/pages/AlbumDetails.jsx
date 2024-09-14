import { useParams } from 'react-router-dom';
import SongsList from '../components/SongsList';
import { albumById } from '../constants';
import useFetchDetails from '../hooks/useFetchDetails';
import Slider from '../components/Slider';
import { useEffect } from 'react';

const AlbumDetails = () => {
    const { id } = useParams();
    const { details, image, loading, error } = useFetchDetails(
        albumById,
        id,
        (image) => image[2].url
    );
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);
    if (loading) {
        return <div>Loading album details...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="min-h-screen py-28 lg:py-20 mx-2 lg:mx-auto ">
            <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24  lg:items-start">
                <div>
                    <img
                        src={image}
                        alt={details?.name}
                        width={250}
                        height={250}
                        className="mx-auto mb-4 rounded-lg"
                        loading="lazy"
                    />
                    <div className="w-[250px] text-gray-600">
                        <h1>{details?.name}</h1>
                        <p>
                            by {details?.artists?.primary[0]?.name} .{' '}
                            {details?.songCount} songs
                        </p>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                    {details?.songs?.map((song) => (
                        <SongsList key={song.id} {...song} />
                    ))}
                </div>
            </div>
            {details?.artists?.all?.length > 0 && (
                <>
                    <h2 className="text-xl px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Artists
                    </h2>
                    <Slider
                        data={details.artists.all}
                        className="grid-rows-1 w-full"
                    />
                </>
            )}
        </div>
    );
};

export default AlbumDetails;
