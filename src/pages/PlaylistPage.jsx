import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SongsList from '../components/SongsList';
import { playlistById } from '../constants';
import { setSongs } from '../features/musicplayer/musicPlayerSlice';
import { useDispatch } from 'react-redux';
import Slider from '../components/Slider';

const PlaylistPage = () => {
    const [album, setAlbum] = useState([]);
    const [image, setImage] = useState([]);
    const dispatch = useDispatch();

    const { id } = useParams();

    const getAlbumDetails = async () => {
        const res = await axios.get(playlistById + `${id}&limit=50&page=0`);
        const { data } = await res.data;
        setAlbum(data);
        dispatch(setSongs(data.songs));
        setImage(getImg(data.image));
    };

    const getImg = (image) => (image = image[image.length - 1].url);

    useEffect(() => {
        getAlbumDetails();
    }, [id]);

    return (
        <div className="min-h-screen py-28 lg:py-20 mx-2 lg:mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24  lg:items-start">
                <div>
                    <img
                        src={image}
                        alt={album.title}
                        width={250}
                        height={250}
                        className="mx-auto mb-4 rounded-lg"
                        loading="lazy"
                    />
                    <div className="w-[250px] text-gray-600">
                        <h1>{album.name}</h1>
                        <p>{album?.songCount} songs</p>
                    </div>
                </div>

                <div>
                    {album.songs?.map((song) => (
                        <SongsList key={song.id} {...song} />
                    ))}
                </div>
            </div>
            {album?.artists?.length > 0 && (
                <>
                    <h2 className="text-xl px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Artists
                    </h2>
                    <Slider
                        data={album.artists}
                        className="grid-rows-1 w-full"
                    />
                </>
            )}
        </div>
    );
};

export default PlaylistPage;
