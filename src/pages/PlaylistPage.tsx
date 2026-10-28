import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { playlistById } from '../constants';
import { extractImageUrl } from '../utils/imageUtils';

const PlaylistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${playlistById}${id}`;

    return <PageTemplate apiUrl={apiUrl} getImageUrl={extractImageUrl} />;
};

export default PlaylistPage;
