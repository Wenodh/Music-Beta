import React from 'react';

const ExploreSkeleton: React.FC = () => {
    const skeletonAspects = [
        'aspect-[3/4]',
        'aspect-[2/3]',
        'aspect-[4/5]',
        'aspect-[1/1]',
        'aspect-[3/5]',
        'aspect-[4/3]'
    ];

    return (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className={`mb-3 sm:mb-4 break-inside-avoid animate-pulse`}
                >
                    <div className={`w-full ${skeletonAspects[i % skeletonAspects.length]} bg-gray-200 dark:bg-neutral-800 rounded-xl sm:rounded-2xl`} />
                </div>
            ))}
        </div>
    );
};

export default ExploreSkeleton;
