import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { albumById } from '../constants';

const AlbumDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${albumById}${id}`;

    const getImageUrl = (data: any) => {
        return data?.image?.[2]?.url || data?.image || '';
    };

    return <PageTemplate apiUrl={apiUrl} getImageUrl={getImageUrl} />;
};

export default AlbumDetails;
