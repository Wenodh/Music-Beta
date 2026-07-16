import React, { useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRadioExplore } from '../hooks/useRadioExplore';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ExploreSongCard from '../../../components/ExploreSongCard';
import ExploreSkeleton from '../../../components/ExploreSkeleton';
import { mediaItemToSong } from '../../../lib/adapters/mediaItemAdapter';
import { IoSearchOutline } from 'react-icons/io5';

interface RadioSectionProps {
    language: string;
    selectedMetadata: string | null;
    activeMetadataType: 'countries' | 'languages' | 'tags' | null;
    columns: number;
}

const RadioSection: React.FC<RadioSectionProps> = ({
    language,
    selectedMetadata,
    activeMetadataType,
    columns
}) => {
    const { items, loading, hasMore, loadMore, reset } = useRadioExplore(
        language,
        selectedMetadata,
        activeMetadataType
    );

    const lastElementRef = useInfiniteScroll({
        loading,
        hasMore,
        onLoadMore: () => loadMore()
    });

    useEffect(() => {
        loadMore(true);
    }, [language, selectedMetadata, activeMetadataType, loadMore]);

    const distributedItems = useMemo(() => {
        return Array.from({ length: columns }, (_, i) =>
            items.filter((_, index) => index % columns === i)
        );
    }, [items, columns]);

    if (items.length === 0 && loading) {
        return <ExploreSkeleton />;
    }

    if (items.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <IoSearchOutline size={64} className="text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold">No stations found</h2>
                <p className="text-gray-500">Try changing your language or filters.</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex gap-2 sm:gap-3 lg:gap-4 items-start">
                {distributedItems.map((columnItems, colIndex) => (
                    <div key={colIndex} className="flex-1 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                        <AnimatePresence mode="popLayout">
                            {columnItems.map((item) => {
                                const globalIndex = items.findIndex(s => s.id === item.id);
                                const song = mediaItemToSong(item);
                                return (
                                    <ExploreSongCard
                                        key={`${item.id}-${globalIndex}`}
                                        song={song}
                                        index={globalIndex}
                                    />
                                );
                            })}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {loading && items.length > 0 && (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <div ref={lastElementRef} className="h-20" />

            {!hasMore && items.length > 0 && (
                <div className="text-center py-12 text-gray-500">
                    You&apos;ve reached the end of the musical universe.
                </div>
            )}
        </>
    );
};

export default React.memo(RadioSection);
