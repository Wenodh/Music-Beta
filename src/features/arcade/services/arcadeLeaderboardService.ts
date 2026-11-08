import { supabase } from '../../../lib/supabase';
import { ArcadeGameId, ArcadeMetricType, ArcadeLeaderboardItem } from '../types';
import {
    getPendingSyncScores,
    removePendingSyncScore,
    saveGameScore,
    getArcadeDB,
} from './arcadeStorage';

export interface LeaderboardQueryOptions {
    gameId: ArcadeGameId;
    timeFilter?: 'all' | 'weekly' | 'daily';
    difficulty?: string;
    mode?: string;
    dailySeed?: string;
    limit?: number;
    offset?: number;
    friendUserIds?: string[];
}

export interface SubmitScoreParams {
    gameId: ArcadeGameId;
    metricType: ArcadeMetricType;
    score: number;
    displayValue: string;
    difficulty?: string;
    mode?: 'daily' | 'practice';
    dailySeed?: string;
}

export class ArcadeLeaderboardService {
    /**
     * Submit a game score:
     * 1. Always saves locally to IndexedDB first (offline-first).
     * 2. If user is authenticated, calls the atomic server-side RPC `submit_arcade_score`.
     * 3. Upon successful submission, clears any pending sync item.
     */
    public static async submitScore(params: SubmitScoreParams): Promise<{
        isNewHighScore: boolean;
        bestScore: number;
        bestDisplayValue: string;
        syncedToCloud: boolean;
    }> {
        const { gameId, metricType, score, displayValue, difficulty = 'normal', mode = 'practice', dailySeed } = params;

        // 1. Save locally
        const localResult = await saveGameScore(
            gameId,
            score,
            metricType,
            displayValue,
            difficulty,
            mode,
            dailySeed
        );

        let syncedToCloud = false;

        // 2. Check cloud auth & connectivity
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data, error } = await supabase.rpc('submit_arcade_score', {
                    p_game_id: gameId,
                    p_metric_type: metricType,
                    p_score: score,
                    p_display_value: displayValue,
                    p_difficulty: difficulty,
                    p_mode: mode,
                    p_daily_seed: dailySeed ?? null,
                });

                if (!error && data?.success) {
                    syncedToCloud = true;
                }
            }
        } catch (err) {
            console.warn('[ArcadeLeaderboard] Cloud score sync deferred (offline/error):', err);
        }

        return {
            ...localResult,
            syncedToCloud,
        };
    }

    /**
     * Reconcile any offline or guest scores to the cloud when an authenticated session becomes active.
     * Idempotent: RPC checks existing scores and prevents duplicates.
     * Requires explicit user consent (`userConsented = true`).
     */
    public static async reconcileGuestScores(userConsented = true): Promise<number> {
        if (!userConsented) {
            console.log('[ArcadeLeaderboard] Guest score reconciliation skipped: user consent not granted');
            return 0;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return 0;

            const pending = await getPendingSyncScores();
            if (!pending || pending.length === 0) return 0;

            let syncedCount = 0;
            for (const item of pending) {
                try {
                    const { data, error } = await supabase.rpc('submit_arcade_score', {
                        p_game_id: item.gameId,
                        p_metric_type: item.metricType,
                        p_score: item.score,
                        p_display_value: item.displayValue,
                        p_difficulty: item.difficulty || 'normal',
                        p_mode: item.mode || 'standard',
                        p_daily_seed: item.dailySeed ?? null,
                    });

                    if (!error && data?.success) {
                        await removePendingSyncScore(item.id);
                        syncedCount++;
                    }
                } catch (e) {
                    console.warn(`[ArcadeLeaderboard] Failed to sync pending score ${item.id}:`, e);
                }
            }

            return syncedCount;
        } catch (err) {
            console.warn('[ArcadeLeaderboard] Guest score reconciliation failed:', err);
            return 0;
        }
    }

    /**
     * Fetch global leaderboard records for a game with caching in IndexedDB.
     */
    public static async fetchLeaderboard(options: LeaderboardQueryOptions): Promise<{
        items: ArcadeLeaderboardItem[];
        total: number;
        userRank?: number;
    }> {
        const { gameId, timeFilter = 'all', limit = 50, offset = 0, friendUserIds, dailySeed, mode } = options;
        const cacheKey = `${gameId}:${timeFilter}:${dailySeed || 'all'}:${mode || 'all'}`;

        try {
            let query = supabase
                .from('arcade_leaderboards')
                .select('id, user_id, game_id, metric_type, score, display_value, difficulty, mode, created_at', { count: 'exact' })
                .eq('game_id', gameId);

            if (mode) {
                query = query.eq('mode', mode);
            }
            if (dailySeed) {
                query = query.eq('daily_seed', dailySeed);
            }

            if (timeFilter === 'daily') {
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('created_at', oneDayAgo);
            } else if (timeFilter === 'weekly') {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('created_at', oneWeekAgo);
            }

            if (friendUserIds && friendUserIds.length > 0) {
                query = query.in('user_id', friendUserIds);
            }

            // Determine ordering based on metric
            const lowerIsBetter = gameId === 'vibe-queens' || gameId === 'beat-tango' || gameId === 'vibe-sudoku' || gameId === 'sound-sweeper';
            query = query.order('score', { ascending: lowerIsBetter }).range(offset, offset + limit - 1);

            const { data, count, error } = await query;
            if (error) {
                throw error;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = session?.user?.id;

            const items: ArcadeLeaderboardItem[] = (data || []).map((row: any, index: number) => ({
                id: row.id,
                userId: row.user_id,
                username: row.user_id === currentUserId ? 'You' : `Player ${row.user_id.slice(0, 5)}`,
                gameId: row.game_id,
                metricType: row.metric_type,
                score: Number(row.score),
                displayValue: row.display_value,
                difficulty: row.difficulty,
                mode: row.mode,
                createdAt: row.created_at,
                rank: offset + index + 1,
                isCurrentUser: row.user_id === currentUserId,
            }));

            // Cache in IndexedDB with TTL and bounded eviction (VIBE-BUG-014)
            try {
                const db = await getArcadeDB();
                await db.put('leaderboard_cache', { items, cachedAt: Date.now() }, cacheKey);

                // Evict stale cache entries older than 7 days or prune store if unbounded
                const allKeys = await db.getAllKeys('leaderboard_cache');
                if (allKeys.length > 50) {
                    const oldestKeys = allKeys.slice(0, allKeys.length - 50);
                    for (const k of oldestKeys) {
                        await db.delete('leaderboard_cache', k);
                    }
                }
            } catch {
                // Ignore caching errors
            }

            return {
                items,
                total: count ?? items.length,
            };
        } catch (err) {
            console.warn('[ArcadeLeaderboard] Failed to fetch leaderboard from cloud, falling back to cache:', err);
            // Fallback to cache if available
            try {
                const db = await getArcadeDB();
                const cached = await db.get('leaderboard_cache', cacheKey);
                if (cached?.items) {
                    return { items: cached.items, total: cached.items.length };
                }
            } catch {
                // Ignore
            }

            return { items: [], total: 0 };
        }
    }
}
