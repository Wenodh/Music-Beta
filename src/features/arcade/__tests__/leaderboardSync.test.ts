import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArcadeLeaderboardService } from '../services/arcadeLeaderboardService';
import { supabase } from '../../../lib/supabase';
import * as storage from '../services/arcadeStorage';

vi.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
        },
        rpc: vi.fn(),
        from: vi.fn(),
    },
}));

vi.mock('../services/arcadeStorage', () => ({
    saveGameScore: vi.fn(),
    getPendingSyncScores: vi.fn(),
    removePendingSyncScore: vi.fn(),
    getArcadeDB: vi.fn(),
}));

describe('ArcadeLeaderboardService & Security Sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits score locally first (offline-first architecture)', async () => {
        (storage.saveGameScore as any).mockResolvedValue({
            isNewHighScore: true,
            bestScore: 1200,
            bestDisplayValue: '1,200 pts',
        });
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: null },
        });

        const result = await ArcadeLeaderboardService.submitScore({
            gameId: 'beat-breaker',
            metricType: 'points',
            score: 1200,
            displayValue: '1,200 pts',
        });

        expect(storage.saveGameScore).toHaveBeenCalledWith(
            'beat-breaker',
            1200,
            'points',
            '1,200 pts',
            'normal',
            'practice',
            undefined
        );
        expect(result.syncedToCloud).toBe(false);
        expect(result.isNewHighScore).toBe(true);
    });

    it('syncs score via atomic RPC when authenticated user is present', async () => {
        (storage.saveGameScore as any).mockResolvedValue({
            isNewHighScore: true,
            bestScore: 2500,
            bestDisplayValue: '2,500 pts',
        });
        (supabase.auth.getSession as any).mockResolvedValue({
            data: {
                session: {
                    user: { id: '00000000-0000-0000-0000-000000000001' },
                },
            },
        });
        (supabase.rpc as any).mockResolvedValue({
            data: { success: true },
            error: null,
        });

        const result = await ArcadeLeaderboardService.submitScore({
            gameId: 'beat-drop',
            metricType: 'points',
            score: 2500,
            displayValue: '2,500 pts',
        });

        expect(supabase.rpc).toHaveBeenCalledWith('submit_arcade_score', {
            p_game_id: 'beat-drop',
            p_metric_type: 'points',
            p_score: 2500,
            p_display_value: '2,500 pts',
            p_difficulty: 'normal',
            p_mode: 'practice',
            p_daily_seed: null,
        });
        expect(result.syncedToCloud).toBe(true);
    });

    it('respects user consent during guest score reconciliation', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } },
        });
        (storage.getPendingSyncScores as any).mockResolvedValue([
            { id: 1, gameId: 'cosmic-beats', metricType: 'points', score: 800, displayValue: '800 pts' },
        ]);

        // When consent is false, reconciliation should NOT run
        const syncCountWithoutConsent = await ArcadeLeaderboardService.reconcileGuestScores(false);
        expect(syncCountWithoutConsent).toBe(0);
        expect(supabase.rpc).not.toHaveBeenCalled();

        // When consent is true, reconciliation proceeds
        (supabase.rpc as any).mockResolvedValue({ data: { success: true }, error: null });
        const syncCountWithConsent = await ArcadeLeaderboardService.reconcileGuestScores(true);
        expect(syncCountWithConsent).toBe(1);
        expect(storage.removePendingSyncScore).toHaveBeenCalledWith(1);
    });
});
