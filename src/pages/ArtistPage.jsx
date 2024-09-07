import { useParams } from "react-router-dom";
import axios from "axios";
import { useEffect, useContext, useState } from "react";
import MusicContext from "../context/MusicContext";
import Navbar from "../components/Navbar";
import Player from "../components/Player";
import SongsList from "../components/SongsList";
import SearchSection from "../components/SearchSection";
import { albumById, artistById } from '../constants';

const ArtistPage = () => {
  const { setSongs } = useContext(MusicContext);
  const [album, setAlbum] = useState([]);
  const [image, setImage] = useState([]);

  const { id } = useParams();

  const getAlbumDetails = async () => {
    const res = await axios.get(artistById +`${id}?sortBy=popularity&songCount=30`);
    const { data } = res.data;
    console.log(data)
    setAlbum(data);
    setSongs(data.topSongs);
    setImage(getImg(data.image));
  };

  const getImg = (image) => (image = image[image.length-1].url);

  useEffect(() => {
    getAlbumDetails();
  }, [id]);

  return (
    <>
      <Navbar />
      <SearchSection />

      <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24 h-screen my-48 lg:my-0 mx-2 lg:mx-auto">
        <div>
          <img
            src={image}
            alt={album.title}
            width={250}
            className="mx-auto mb-4 rounded-lg"
            loading="lazy"
          />
          <div className="w-[250px] text-gray-600">
            <h1>{album.name}</h1>
            <p>
              by {album?.artists?.primary[0]?.name} . {album.songCount} songs
            </p>
          </div>
        </div>

        <div>
          {album.topSongs?.map((song) => (
            <SongsList key={song.id} {...song} />
          ))}
        </div>
      </div>

      <Player />
    </>
  );
};

export default ArtistPage;
