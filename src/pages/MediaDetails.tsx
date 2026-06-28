import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { audioSDK } from '../lib/audio-sdk';
import { MediaItem } from '../lib/audio-sdk/models';
import PageTemplate from '../components/PageTemplate';
import { mediaItemToSong } from '../lib/adapters/mediaItemAdapter';

interface MediaDetailsProps {
    provider?: string;
    type?: string;
}

const MediaDetails: React.FC<MediaDetailsProps> = ({
    provider: propProvider,
    type: propType
}) => {
    const { provider: urlProvider, type: urlType, id } = useParams<{ provider: string, type: string, id: string }>();

    const provider = propProvider || urlProvider || 'jiosaavn';
    const type = propType || urlType || 'album';

    const [item, setItem] = useState<MediaItem | null>(null);
    const [children, setChildren] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMedia = async () => {
            if (!id) return;
            try {
                setLoading(true);
                setError(null);

                const mediaItem = await audioSDK.getMedia(id, provider, type);
                if (!mediaItem) {
                    throw new Error('Media not found');
                }
                setItem(mediaItem);

                // Fetch children based on type
                if (type === 'podcast') {
                    const episodes = await audioSDK.getEpisodes(id);
                    setChildren(episodes);
                } else if (type === 'audiobook') {
                    const chapters = await audioSDK.getChapters(id);
                    setChildren(chapters);
                } else if (type === 'artist') {
                    const recommendations = await audioSDK.getRecommendations(id, provider);
                    setChildren(recommendations);
                } else {
                    // For albums/playlists, children are usually in the metadata or fetched separately
                    // If provider doesn't include them in getMedia, we might need a specific call
                    // For now assume they are in metadata or children if any
                }
            } catch (err: any) {
                console.error('Error fetching media details:', err);
                setError(err.message || 'Failed to load details');
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, [id, provider, type]);

    // Adapt MediaItem to the structure PageTemplate expects
    const adaptedDetails = useMemo(() => {
        if (!item) return null;

        const songs = children.length > 0
            ? children.map(mediaItemToSong)
            : (item.metadata?.songs || item.metadata?.episodes || []).map((s: any) =>
                typeof s === 'object' && s.id ? mediaItemToSong(s) : s
              );

        return {
            ...item,
            name: item.title,
            image: item.artwork,
            primaryArtists: item.artist,
            songs,
            type: item.type,
            id: item.id
        };
    }, [item, children]);

    if (loading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error || !adaptedDetails) return (
        <div className="p-10 text-center">
            <p className="text-primary font-medium">{error || 'Media not found'}</p>
        </div>
    );

    return (
        <PageTemplate
            details={adaptedDetails as any}
        />
    );
};

export default MediaDetails;
