import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { artistById } from '../constants';
import { extractImageUrl } from '../utils/imageUtils';

const ArtistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${artistById}${id}`;

    return <PageTemplate apiUrl={apiUrl} getImageUrl={extractImageUrl} />;
};

export default ArtistPage;
