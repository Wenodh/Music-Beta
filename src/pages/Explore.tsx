import { logger } from "../lib/logger";
import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../hooks/redux';
import { AnimatePresence, motion } from 'framer-motion';
import { IoCompassOutline, IoRadioOutline, IoGlobeOutline, IoLanguageOutline, IoPricetagOutline, IoClose } from 'react-icons/io5';
import { providerRegistry } from '../lib/audio-sdk/registry';
import { RadioBrowserProvider } from '../lib/audio-sdk/providers/radio-browser';
import { useMasonryColumns } from '../hooks/useMasonryColumns';
import MusicSection from './explore/sections/MusicSection';
import RadioSection from './explore/sections/RadioSection';
import PodcastSection from './explore/sections/PodcastSection';
import AudiobookSection from './explore/sections/AudiobookSection';

const Explore: React.FC = () => {
    const { language } = useAppSelector((state) => state.language);
    const [activeTab, setActiveTab] = useState<'music' | 'radio' | 'podcasts' | 'audiobooks'>('music');
    const [metadataList, setMetadataList] = useState<any[]>([]);
    const [activeMetadataType, setActiveMetadataType] = useState<'countries' | 'languages' | 'tags' | null>(null);
    const [selectedMetadata, setSelectedMetadata] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const columns = useMasonryColumns();

    useEffect(() => {
        // Reset radio filters when tab changes away from radio
        if (activeTab !== 'radio') {
            setSelectedMetadata(null);
            setActiveMetadataType(null);
            setMetadataList([]);
        }
    }, [activeTab]);

    const fetchMetadata = async (type: 'countries' | 'languages' | 'tags') => {
        const radioProvider = providerRegistry.getProvider('radio-browser') as RadioBrowserProvider;
        if (!radioProvider) return;

        setLoading(true);
        try {
            let list = [];
            if (type === 'countries') list = await radioProvider.getCountries();
            else if (type === 'languages') list = await radioProvider.getLanguages();
            else if (type === 'tags') list = await radioProvider.getTags();

            // Filter out empty names and sort by station count
            list = list.filter((i: any) => i.name).sort((a: any, b: any) => b.stationcount - a.stationcount);
            setMetadataList(list);
            setActiveMetadataType(type);
        } catch (error) {
            logger.error('Error fetching metadata:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMetadataSelect = (name: string) => {
        setSelectedMetadata(name);
        setMetadataList([]); // Hide list
    };

    return (
        <div className="pb-32 pt-1 px-2 sm:px-4 sm:pt-4 gpu-accelerated contain-layout overflow-y-auto custom-scrollbar h-full">
            <header className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg text-primary" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)' }}>
                                <IoCompassOutline className="text-lg sm:text-xl" />
                            </div>
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Explore</h1>
                        </div>
                        <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 leading-tight max-w-2xl">
                            Discover new music in <span className="text-primary font-medium capitalize">{language}</span> curated just for you.
                        </p>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-stretch sm:self-center overflow-x-auto no-scrollbar flex-shrink-0 max-w-full">
                        <button
                            onClick={() => setActiveTab('music')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'music' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Music
                        </button>
                        <button
                            onClick={() => setActiveTab('radio')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'radio' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <IoRadioOutline /> Radio
                        </button>
                        <button
                            onClick={() => setActiveTab('podcasts')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'podcasts' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Podcasts
                        </button>
                        <button
                            onClick={() => setActiveTab('audiobooks')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'audiobooks' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Audiobooks
                        </button>
                    </div>
                </div>

                {activeTab === 'radio' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <button
                                onClick={() => activeMetadataType === 'countries' ? setActiveMetadataType(null) : fetchMetadata('countries')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeMetadataType === 'countries' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <IoGlobeOutline /> {selectedMetadata && activeMetadataType === 'countries' ? selectedMetadata : 'Countries'}
                            </button>
                            <button
                                onClick={() => activeMetadataType === 'languages' ? setActiveMetadataType(null) : fetchMetadata('languages')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeMetadataType === 'languages' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <IoLanguageOutline /> {selectedMetadata && activeMetadataType === 'languages' ? selectedMetadata : 'Languages'}
                            </button>
                            <button
                                onClick={() => activeMetadataType === 'tags' ? setActiveMetadataType(null) : fetchMetadata('tags')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeMetadataType === 'tags' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <IoPricetagOutline /> {selectedMetadata && activeMetadataType === 'tags' ? selectedMetadata : 'Genres'}
                            </button>

                            {selectedMetadata && (
                                <button
                                    onClick={() => {
                                        setSelectedMetadata(null);
                                        setActiveMetadataType(null);
                                        setMetadataList([]);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                                >
                                    <IoClose /> Clear Filter
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {metadataList.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 max-h-48 overflow-y-auto custom-scrollbar">
                                        {metadataList.slice(0, 50).map((item) => (
                                            <button
                                                key={item.name}
                                                onClick={() => handleMetadataSelect(item.name)}
                                                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                                            >
                                                {item.name}
                                                <span className="text-[10px] text-gray-400">{item.stationcount}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </header>

            {activeTab === 'music' && <MusicSection language={language} columns={columns} />}
            {activeTab === 'radio' && <RadioSection language={language} selectedMetadata={selectedMetadata} activeMetadataType={activeMetadataType} columns={columns} />}
            {activeTab === 'podcasts' && <PodcastSection language={language} columns={columns} />}
            {activeTab === 'audiobooks' && <AudiobookSection language={language} columns={columns} />}

        </div>
    );
};

export default Explore;
