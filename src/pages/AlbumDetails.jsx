import { useParams } from 'react-router-dom';
import SongsList from '../components/SongsList';
import { albumById } from '../constants';
import useFetchDetails from '../hooks/useFetchDetails';

const AlbumDetails = () => {
    const { id } = useParams();
    const { details, image, loading, error } = useFetchDetails(
        albumById,
        id,
        (image) => image[2].url
    );

    if (loading) {
        return <div>Loading album details...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <>
            <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24 my-28 lg:my-20 mx-2 lg:mx-auto lg:items-start">
                <div>
                    <img
                        src={image}
                        alt={details?.title}
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

                <div>
                    {details?.songs?.map((song) => (
                        <SongsList key={song.id} {...song} />
                    ))}
                </div>
            </div>
        </>
    );
};

export default AlbumDetails;
