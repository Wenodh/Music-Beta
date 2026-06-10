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
        <div className="columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-8 gap-2 sm:gap-3 lg:gap-4">
            {[...Array(20)].map((_, i) => (
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
