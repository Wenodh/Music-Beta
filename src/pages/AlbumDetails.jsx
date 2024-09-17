import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { albumById } from '../constants';

const AlbumDetails = () => {
    const { id } = useParams();
    const apiUrl = `${albumById}${id}`;
    return (
        <PageTemplate apiUrl={apiUrl} getImageUrl={(image) => image[2]?.url} />
    );
};

export default AlbumDetails;
