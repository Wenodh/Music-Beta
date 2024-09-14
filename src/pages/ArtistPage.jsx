import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SongsList from '../components/SongsList';
import { artistById } from '../constants';
import { setSongs } from '../features/musicplayer/musicPlayerSlice';
import Slider from '../components/Slider';

const ArtistPage = () => {
    const [album, setAlbum] = useState([]);
    const [image, setImage] = useState([]);

    const { id } = useParams();

    const getAlbumDetails = async () => {
        const res = await axios.get(
            artistById + `${id}?sortBy=popularity&songCount=30`
        );
        const { data } = res.data;
        setAlbum(data);
        setSongs(data.topSongs);
        setImage(getImg(data.image));
    };
    const getImg = (image) => (image = image[image.length - 1].url);

    useEffect(() => {
        getAlbumDetails();
        window.scrollTo(0, 0);
    }, [id]);

    return (
        <div className="min-h-screen py-28 lg:py-20 mx-2 lg:mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24  lg:items-start">
                <div>
                    <img
                        src={image}
                        alt={album.name}
                        width={250}
                        height={250}
                        className="mx-auto mb-4 rounded-lg"
                        loading="lazy"
                    />
                    <div className="w-[250px] text-gray-600">
                        <center>{album.name}</center>
                        <p>
                            {album.songCount ? `${album.songCount} songs` : ''}
                        </p>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                    {album.topSongs?.map((song) => (
                        <SongsList key={song.id} {...song} />
                    ))}
                </div>
            </div>
            {album?.topAlbums?.length > 0 && (
                <>
                    <h2 className="text-xl px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Albums
                    </h2>
                    <Slider
                        data={album.topAlbums}
                        className="grid-rows-1 w-full"
                    />
                </>
            )}
            {album?.similarArtists?.length > 0 && (
                <>
                    <h2 className="text-xl px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-full lg:w-[78vw] mx-auto">
                        Similar Artists
                    </h2>
                    <Slider
                        data={album.similarArtists}
                        className="grid-rows-1 w-full"
                    />
                </>
            )}
        </div>
    );
};

export default ArtistPage;
