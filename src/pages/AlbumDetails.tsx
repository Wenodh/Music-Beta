import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { albumById } from '../constants';
import { extractImageUrl } from '../utils/imageUtils';

const AlbumDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${albumById}${id}`;

    return <PageTemplate apiUrl={apiUrl} getImageUrl={extractImageUrl} />;
};

export default AlbumDetails;
