import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../../../lib/logger';

interface PaginationState<T> {
    items: T[];
    page: number;
    loading: boolean;
    hasMore: boolean;
    error: string | null;
}

export interface UseExplorePaginationOptions<T> {
    fetchFn: (page: number, signal: AbortSignal) => Promise<T[]>;
    pageSize?: number;
    initialPage?: number;
}

export function useExplorePagination<T>({
    fetchFn,
    pageSize = 30,
    initialPage = 0
}: UseExplorePaginationOptions<T>) {
    const [state, setState] = useState<PaginationState<T>>({
        items: [],
        page: initialPage,
        loading: false,
        hasMore: true,
        error: null
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const isFetchingRef = useRef(false);
    const stateRef = useRef(state);

    // Sync ref with state
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const loadMore = useCallback(async (isReset = false) => {
        const currentState = stateRef.current;
        if (!isReset && (isFetchingRef.current || !currentState.hasMore)) return;

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetchingRef.current = true;

        const nextPage = isReset ? initialPage : currentState.page;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const newItems = await fetchFn(nextPage, controller.signal);

            if (controller.signal.aborted) return;

            setState(prev => {
                const combinedItems = isReset ? newItems : [...prev.items, ...newItems];

                // Deduplicate items using their unique IDs (provider:id or canonicalId)
                const seen = new Set();
                const uniqueItems = combinedItems.filter(item => {
                    const id = (item as any).canonicalId || `${(item as any).provider}:${(item as any).id}`;
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });

                return {
                    items: uniqueItems,
                    page: nextPage + 1,
                    loading: false,
                    hasMore: newItems.length >= pageSize,
                    error: null
                };
            });
        } catch (error: any) {
            if (error.name === 'AbortError') return;

            logger.error('Error fetching explore items:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'An error occurred while fetching items'
            }));
        } finally {
            if (abortControllerRef.current === controller) {
                isFetchingRef.current = false;
            }
        }
    }, [fetchFn, initialPage, pageSize]);

    const reset = useCallback(() => {
        setState({
            items: [],
            page: initialPage,
            loading: false,
            hasMore: true,
            error: null
        });
        // We need to trigger loadMore(true) but setState is async.
        // The component using this hook will typically call reset() and then loadMore(true)
        // or we can use an effect if we add a reset trigger state.
    }, [initialPage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        ...state,
        loadMore,
        reset,
        setItems: (items: T[]) => setState(prev => ({ ...prev, items }))
    };
}
