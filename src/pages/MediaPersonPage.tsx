import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoArrowBack, IoPeopleOutline, IoLanguageOutline, IoPricetagOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { audioSDK } from '../lib/audio-sdk';
import { MediaItem } from '../lib/audio-sdk/models';
import Slider from '../components/Slider';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { mediaItemToSong } from '../lib/adapters/mediaItemAdapter';

const MediaPersonPage: React.FC = () => {
    const { provider, type, id } = useParams<{ provider: string; type: string; id: string }>();
    const navigate = useNavigate();
    const [details, setDetails] = useState<MediaItem | null>(null);
    const [works, setWorks] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { theme } = useAppSelector(state => state.ui);

    useEffect(() => {
        const fetchPerson = async () => {
            if (!id || !provider || !type) return;
            setLoading(true);
            try {
                // For LibriVox authors, we might search for books by that author
                if (provider === 'librivox' && type === 'author') {
                    // LibriVox API doesn't have a direct "getAuthor" by ID, usually it's author search
                    // The ID in this case might be the author name or a search query
                    const results = await audioSDK.searchAudiobooks(id);
                    if (results.length > 0) {
                        // Create a mock MediaItem for the author based on the first result
                        const firstBook = results[0];
                        const authorInfo = (firstBook.metadata as any).authors?.find((a: any) => `${a.first_name} ${a.last_name}` === id) ||
                                           { first_name: id, last_name: '' };

                        setDetails({
                            id,
                            provider,
                            type: 'artist' as any, // Generalize to artist/person
                            title: `${authorInfo.first_name} ${authorInfo.last_name}`,
                            artwork: [],
                            playable: false,
                            metadata: authorInfo
                        } as any);
                        setWorks(results);
                    }
                }
            } catch (error) {
                console.error('Error fetching person details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPerson();
    }, [id, provider, type]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold">Person not found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">Go Back</button>
            </div>
        );
    }

    const worksAsSongs = works.map(w => mediaItemToSong(w));

    return (
        <div className="pb-32">
            {/* Hero Section */}
            <div className="relative h-[30vh] sm:h-[40vh] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
                <div
                    className="absolute inset-0 blur-3xl opacity-50 scale-110"
                    style={{ backgroundColor: theme.accentColor }}
                />

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 z-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-6 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all"
                    >
                        <IoArrowBack size={24} />
                    </button>
                    <div className="flex items-end gap-6">
                        <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden">
                             {details.artwork?.[0]?.url ? (
                                 <img src={details.artwork[0].url} alt={details.title} className="w-full h-full object-cover" />
                             ) : (
                                 <IoPeopleOutline size={64} className="text-white/40" />
                             )}
                        </div>
                        <div className="flex-1">
                            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">
                                {type === 'author' ? 'Author' : 'Artist'}
                            </span>
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter mb-2">
                                {decodeHtmlEntities(details.title)}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-300">
                                <span className="flex items-center gap-1.5">
                                    <IoPricetagOutline /> {works.length} Works
                                </span>
                                {details.language && (
                                    <span className="flex items-center gap-1.5 uppercase">
                                        <IoLanguageOutline /> {details.language}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 sm:px-12 mt-12">
                 {works.length > 0 && (
                     <Slider data={worksAsSongs} title={`Works by ${details.title}`} />
                 )}

                 {details.description && (
                     <div className="mt-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
                         <h3 className="text-xl font-black mb-4 uppercase tracking-wider text-gray-400">Biography</h3>
                         <p className="text-gray-300 leading-relaxed max-w-4xl">
                             {decodeHtmlEntities(details.description)}
                         </p>
                     </div>
                 )}
            </div>
        </div>
    );
};

export default MediaPersonPage;
