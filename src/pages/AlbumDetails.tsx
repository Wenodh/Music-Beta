import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';

const AlbumDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `https://saavn.dev/api/albums?id=${id}`;

    const getImageUrl = (data: any) => {
        return data?.image?.[2]?.url || data?.image || '';
    };

    return <PageTemplate apiUrl={apiUrl} getImageUrl={getImageUrl} />;
};

export default AlbumDetails;
