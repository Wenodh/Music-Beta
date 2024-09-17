import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { playlistById } from '../constants';

const PlaylistPage = () => {
    const { id } = useParams();
    const apiUrl = playlistById + id;

    return (
        <PageTemplate
            apiUrl={apiUrl}
            getImageUrl={(image) => image[image.length - 1]?.url}
        />
    );
};

export default PlaylistPage;
