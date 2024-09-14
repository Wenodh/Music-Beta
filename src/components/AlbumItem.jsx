import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    playMusic,
    pauseMusic,
} from '../features/musicplayer/musicPlayerSlice';
import { FaPause, FaPlay } from 'react-icons/fa';
import { useMemo } from 'react';

const AlbumItem = (props) => {
    const {
        name,
        artists,
        id,
        image,
        title,
        type,
        downloadUrl,
        duration,
        album,
    } = props;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isPlaying, currentSong } = useSelector(
        (state) => state.musicPlayer
    );
    const isCurrentSongPlaying = isPlaying && currentSong?.id === id;

    const handleClick = () => {
        if ((!type || type === 'song') && downloadUrl?.length) {
            if (isCurrentSongPlaying) {
                dispatch(pauseMusic());
            } else {
                const songData = {
                    music: downloadUrl,
                    name,
                    duration,
                    image,
                    id,
                    primaryArtists:
                        artists?.primary[0]?.name || props?.primaryArtists,
                    albumId: album?.id || props?.albumId,
                };
                // Play the music
                dispatch(playMusic(songData));
            }
        } else if (type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'album') {
            navigate(`/albums/${id}`);
        } else if (type === 'artist') {
            navigate(`/artists/${id}`);
        }
    };

    const artistsString = useMemo(() => {
        return artists?.all?.map((artist) => artist.name).join(', ');
    }, [artists]);

    return (
        <div
            className="w-24 md:w-36 max-h-56 overflow-y-clip flex flex-col justify-center items-center gap-3 rounded-lg"
            onClick={handleClick}
        >
            <div className="relative group cursor-pointer">
                <img
                    src={image[1]?.url}
                    alt="music cover"
                    className={`w-full min-w-24 min-h-24 md:min-w-36 md:min-h-36 transition duration-300 ease-in-out group-hover:brightness-50  shadow-lg ${
                        isCurrentSongPlaying ? 'brightness-50' : ''
                    } ${type === 'artist' ? 'rounded-full' : 'rounded-md'}`}
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
                {type === 'artist' ? (
                    <center className=" font-semibold overflow-x-clip w-full truncate">
                        {name}
                    </center>
                ) : (
                    <>
                        <p className=" font-semibold overflow-x-clip w-full truncate">
                            {name}
                        </p>
                        <p className="font-thin text-xs truncate w-full ">
                            {artistsString}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AlbumItem;
