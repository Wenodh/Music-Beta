import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { activityService } from '../services/ActivityService';
import { setActivityFeed, appendActivityFeed, setLoading, setError } from '../socialSlice';

export const useActivityFeed = () => {
    const dispatch = useDispatch();
    const feed = useSelector((state: RootState) => state.social.activityFeed);
    const loading = useSelector((state: RootState) => state.social.loading.feed);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchFeed = useCallback(async (isInitial = false) => {
        dispatch(setLoading({ key: 'feed', value: true }));
        try {
            const result = await activityService.getFeed(isInitial ? undefined : cursor || undefined);
            if (isInitial) {
                dispatch(setActivityFeed(result.items));
            } else {
                dispatch(appendActivityFeed(result.items));
            }
            setCursor(result.nextCursor);
            setHasMore(!!result.nextCursor);
        } catch (err: any) {
            dispatch(setError(err.message));
        } finally {
            dispatch(setLoading({ key: 'feed', value: false }));
        }
    }, [cursor, dispatch]);

    useEffect(() => {
        if (feed.length === 0) {
            fetchFeed(true);
        }
    }, []);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchFeed();
        }
    };

    return { feed, loading, hasMore, loadMore, refresh: () => fetchFeed(true) };
};
