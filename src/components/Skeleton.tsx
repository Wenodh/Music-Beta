import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect' }) => {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-800";

  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

export const SongSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-2">
    <Skeleton className="w-12 h-12 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-1/4" />
    </div>
  </div>
);

export const AlbumSkeleton: React.FC = () => (
  <div className="flex-shrink-0 w-40 space-y-3">
    <Skeleton className="w-40 h-40" />
    <Skeleton variant="text" className="w-3/4" />
    <Skeleton variant="text" className="w-1/2" />
  </div>
);

export default Skeleton;
