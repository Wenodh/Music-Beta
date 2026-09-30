import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
    return (
        <div className={`animate-pulse bg-gray-200/60 dark:bg-neutral-800/60 rounded-lg ${className}`} />
    );
};

export const CardSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
            <div className="w-full aspect-square rounded-xl bg-gray-200/60 dark:bg-neutral-800/60" />
            <div className="h-4 w-3/4 bg-gray-200/60 dark:bg-neutral-800/60 rounded" />
            <div className="h-3 w-1/2 bg-gray-200/60 dark:bg-neutral-800/60 rounded" />
        </div>
    );
};

export const SongRowSkeleton: React.FC = () => {
    return (
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 animate-pulse">
            <div className="w-12 h-12 rounded-lg bg-gray-200/60 dark:bg-neutral-800/60 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200/60 dark:bg-neutral-800/60 rounded" />
                <div className="h-3 w-1/4 bg-gray-200/60 dark:bg-neutral-800/60 rounded" />
            </div>
            <div className="w-10 h-3 bg-gray-200/60 dark:bg-neutral-800/60 rounded hidden sm:block" />
        </div>
    );
};

export const PageHeaderSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 animate-pulse mb-8">
            <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl bg-gray-200/60 dark:bg-neutral-800/60 flex-shrink-0" />
            <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                <div className="h-3 w-20 bg-gray-200/60 dark:bg-neutral-800/60 rounded mx-auto sm:mx-0" />
                <div className="h-8 w-3/4 bg-gray-200/60 dark:bg-neutral-800/60 rounded mx-auto sm:mx-0" />
                <div className="h-4 w-1/2 bg-gray-200/60 dark:bg-neutral-800/60 rounded mx-auto sm:mx-0" />
                <div className="flex justify-center sm:justify-start gap-3 pt-2">
                    <div className="w-12 h-12 rounded-full bg-gray-200/60 dark:bg-neutral-800/60" />
                    <div className="w-12 h-12 rounded-full bg-gray-200/60 dark:bg-neutral-800/60" />
                </div>
            </div>
        </div>
    );
};

export default Skeleton;
