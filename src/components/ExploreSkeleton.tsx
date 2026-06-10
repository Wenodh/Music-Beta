import React from 'react';
import { useMasonryColumns } from '../hooks/useMasonryColumns';

const ExploreSkeleton: React.FC = () => {
    const columns = useMasonryColumns();
    const skeletonAspects = [
        'aspect-[3/4]',
        'aspect-[2/3]',
        'aspect-[4/5]',
        'aspect-[1/1]',
        'aspect-[3/5]',
        'aspect-[4/3]'
    ];

    return (
        <div className="flex gap-2 sm:gap-3 lg:gap-4 items-start">
            {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                    {[...Array(Math.ceil(20 / columns))].map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse"
                        >
                            <div className={`w-full ${skeletonAspects[(i * columns + colIndex) % skeletonAspects.length]} bg-gray-200 dark:bg-neutral-800 rounded-xl sm:rounded-2xl`} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default ExploreSkeleton;
