import { useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MusicContext from '../context/MusicContext';
import { url } from '../constants';

const SongItem = ({ id, title, image, type, primaryArtists }) => {
    const navigate = useNavigate();
    const { playMusic, setSearchedSongs } = useContext(MusicContext);
    const [loading, setLoading] = useState(false); // Loading state for song fetching

    const handleClick = useCallback(async () => {
        if (type === 'song') {
            try {
                setLoading(true); // Start loading
                const { data } = await axios.get(`${url}/api/songs/${id}`);
                const { downloadUrl, name, duration } = data[0];
                playMusic(downloadUrl, name, duration, image, id, primaryArtists);
            } catch (error) {
                console.error('Failed to fetch song details:', error);
            } finally {
                setLoading(false); // End loading
            }
        } else {
            let route = '';
            switch (type) {
                case 'album':
                    route = `/albums/${id}`;
                    break;
                case 'artist':
                    route = `/artists/${id}`;
                    break;
                case 'playlist':
                    route = `/playlists/${id}`;
                    break;
                default:
                    return;
            }
            navigate(route);
            setSearchedSongs([]); // Clear search results after navigating
        }
    }, [type, id, image, primaryArtists, playMusic, setSearchedSongs, navigate]);

    return (
        <div className="min-w-[60px] max-w-[80px] max-h-[140px] md:max-w-[120px] md:max-h-[180px]  overflow-y-clip flex flex-col justify-center items-center gap-2 rounded-lg">
            <img
                src={image[2].url}
                alt={title}
                className={`rounded-lg cursor-pointer ${loading ? 'opacity-50' : ''}`}
                onClick={handleClick}
                loading="lazy"
            />
            <div className="text-[13px] w-full text-center truncate">
                <span className="font-semibold">{title}</span>
            </div>
        </div>
    );
};

export default SongItem;
