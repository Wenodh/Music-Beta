import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SongsList from '../components/SongsList';
import { artistById } from '../constants';
import MusicContext from '../context/MusicContext';
import { setSongs } from '../features/musicPlayer/musicPlayerSlice';

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
    }, [id]);

    return (
        <>
            <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24 py-28 lg:py-20 mx-2 lg:mx-auto lg:items-start min-h-screen">
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
                        <p>
                            by {album?.artists?.primary[0]?.name} .{' '}
                            {album.songCount} songs
                        </p>
                    </div>
                </div>

                <div>
                    {album.topSongs?.map((song) => (
                        <SongsList key={song.id} {...song} />
                    ))}
                </div>
            </div>
        </>
    );
};

export default ArtistPage;
