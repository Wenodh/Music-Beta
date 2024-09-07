import { useContext } from 'react';
import MusicContext from '../context/MusicContext';
import axios from 'axios';
import { url } from '../constants';
import { useNavigate } from 'react-router-dom';

const SongItem = (props) => {
    const navigate = useNavigate();
  const { playMusic, setSearchedSongs } = useContext(MusicContext);
    const { id, title, image, type } = props;
  const handleClick = async () => {
      console.log(type)
        if (type === 'song') {
            const res = await axios.get(url + '/api/songs/' + id);
            const { data } = await res.data;
            const { downloadUrl, name, duration } = data[0];
            playMusic(
                downloadUrl,
                name,
                duration,
                image,
                id,
                props.primaryArtists
            );
        } else if (type === 'album') {
          console.log("called")
          navigate(`/albums/${id}`);
          setSearchedSongs([])
      } else if (type === 'artist') {
        console.log("called")
        navigate(`/artists/${id}`);
        setSearchedSongs([])
    }
    };
    return (
        <div className="max-w-[120px] max-h-[180px] overflow-y-clip flex flex-col justify-center items-center gap-1 md:gap-2 lg:gap-3 rounded-lg">
            <img
                src={image[2].url}
                alt=""
                className="rounded-lg cursor-pointer"
                onClick={() => handleClick()}
                loading="lazy"
                // onClick={() =>
                //   playMusic(downloadUrl, name, duration, image, id, primaryArtists)
                // }
            />
            <div className="text-[13px] w-full flex flex-col justify-center items-center">
                <span className="font-semibold overflow-x-clip">
                    {type} {title}
                </span>
            </div>
        </div>
    );
};

export default SongItem;
