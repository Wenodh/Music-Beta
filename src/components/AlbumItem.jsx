import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { playMusic, pauseMusic } from '../features/musicplayer/musicPlayerSlice';
import { FaPause, FaPlay } from 'react-icons/fa';
import { useMemo } from 'react';

const AlbumItem = ({
    name,
    artists,
    id,
    image,
    title,
    type,
    downloadUrl,
    duration,
    album,
}) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isPlaying, currentSong } = useSelector((state) => state.musicPlayer);

    const isCurrentSongPlaying = isPlaying && currentSong?.id === id;

    const handleClick = () => {
        if (type === 'song' && downloadUrl?.length) {
            if (isCurrentSongPlaying) {
                dispatch(pauseMusic());
            } else {
                dispatch(playMusic({
                    music: downloadUrl,
                    name,
                    duration,
                    image,
                    id,
                    primaryArtists: artists?.primary[0]?.name,
                    albumId: album?.id
                }));
            }
        } else if (type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'album') {
            navigate(`/albums/${id}`);
        }
    };

    const artistsString = useMemo(() => {
        return artists?.all?.map((artist) => artist.name).join(', ');
    }, [artists]);

    return (
        <div
            className="w-36 max-h-56 overflow-y-clip flex flex-col justify-center items-center gap-3 rounded-lg"
            onClick={handleClick}
        >
            <div className="relative group cursor-pointer">
                <img
                    src={image[1]?.url}
                    alt="music cover"
                    className={`w-full min-w-36 min-h-36 transition duration-300 ease-in-out group-hover:brightness-50 rounded-md shadow-lg ${
                        isCurrentSongPlaying ? 'brightness-50' : ''
                    }`}
                    width={150}
                    height={150}
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
            <div className="text-[13px] w-full flex flex-col justify-center items-center text-gray-800 dark:text-gray-300">
                <span className=" font-semibold overflow-x-clip w-full truncate">
                    {name}
                </span>
                <p className="font-thin text-xs truncate w-full ">
                    {artistsString}
                </p>
            </div>
        </div>
    );
};

export default AlbumItem;
