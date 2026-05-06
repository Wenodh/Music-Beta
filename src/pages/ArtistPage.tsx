import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { artistById } from '../constants';

const ArtistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${artistById}${id}`;

    const getImageUrl = (data: any) => {
        return data?.image?.[2]?.url || data?.image || '';
    };

    return <PageTemplate apiUrl={apiUrl} getImageUrl={getImageUrl} />;
};

export default ArtistPage;
