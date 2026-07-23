import { useEffect, useRef, useCallback } from 'react';

export interface UseInfiniteScrollOptions {
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    rootMargin?: string;
    threshold?: number;
}

export function useInfiniteScroll({
    loading,
    hasMore,
    onLoadMore,
    rootMargin = '100px',
    threshold = 0.1
}: UseInfiniteScrollOptions) {
    const observer = useRef<IntersectionObserver | null>(null);

    const lastElementRef = useCallback((node: HTMLElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                onLoadMore();
            }
        }, {
            rootMargin,
            threshold
        });

        if (node) {
            observer.current.observe(node);
        }
    }, [loading, hasMore, onLoadMore, rootMargin, threshold]);

    // Disconnect on unmount
    useEffect(() => {
        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, []);

    return lastElementRef;
}
