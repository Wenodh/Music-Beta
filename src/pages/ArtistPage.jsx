import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { artistById } from '../constants';

const ArtistPage = () => {
    const { id } = useParams();
    const apiUrl = artistById + `${id}?sortBy=popularity&songCount=30`;

    return (
        <PageTemplate
            apiUrl={apiUrl}
            getImageUrl={(image) => image[image.length - 1]?.url}
        />
    );
};

export default ArtistPage;
