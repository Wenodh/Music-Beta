import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MusicContext from '../context/MusicContext';
import { FaPause, FaPlay } from 'react-icons/fa';

const AlbumItem = ({
    name,
    artists,
    id,
    image,
    title,
    type,
    downloadUrl,
    duration,
}) => {
    const navigate = useNavigate();
    const { isPlaying, currentSong, playMusic } = useContext(MusicContext);

    // Check if the current song is playing
    const isCurrentSongPlaying = isPlaying && currentSong?.id === id;

    // Handle click event depending on the type (song or album)
    const handleClick = () => {
        if (type === 'song' && downloadUrl?.length) {
            playMusic(downloadUrl, name, duration, image, id, artists?.primary[0]?.name);
        } else {
            navigate(`/albums/${id}`);
        }
    };

    // Memoize artists string to avoid recalculating on every render
    const artistsString = useMemo(() => {
        return artists?.all?.map((artist) => artist.name).join(', ');
    }, [artists]);

    return (
        <div
            className="w-[160px] max-h-[220px] overflow-y-clip flex flex-col justify-center items-center gap-3 rounded-lg"
            onClick={handleClick}
        >
            <div className="relative group cursor-pointer">
                <img
                    src={image[2]?.url}
                    alt="music cover"
                    className={`w-full h-auto transition duration-300 ease-in-out group-hover:brightness-50 ${
                        isCurrentSongPlaying ? 'brightness-50' : ''
                        }`}
                    loading="lazy"
                />
                <div
                    className={`absolute inset-0 flex justify-center items-center text-white opacity-0 group-hover:opacity-100 transition duration-300 ease-in-out ${
                        isCurrentSongPlaying ? 'opacity-100' : ''
                    }`}
                >
                    {isCurrentSongPlaying ? (
                        <FaPause
                            size={60}
                            className="text-white cursor-pointer p-3 shadow-lg"
                        />
                    ) : (
                        <FaPlay
                            size={60}
                            className="text-white cursor-pointer p-3 shadow-lg"
                        />
                    )}
                </div>
            </div>
            <div className="text-[13px] w-full flex flex-col justify-center items-center">
                <span className="text-gray-600 font-semibold overflow-x-clip w-full truncate">
                    {name}
                </span>
                <p className="text-gray-500 font-thin text-xs truncate w-full">
                    {artistsString}
                </p>
            </div>
        </div>
    );
};

export default AlbumItem;
