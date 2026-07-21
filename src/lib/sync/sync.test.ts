import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncManager } from './SyncManager';
import { supabase } from '../supabase';
import { StorageService } from '../storage/StorageService';

// Mock Supabase with chaining support
vi.mock('../supabase', () => {
    const mock = {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockResolvedValue({ error: null }),
        match: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    return { supabase: mock };
});

// Mock StorageService
vi.mock('../storage/StorageService', () => ({
    StorageService: {
        addSyncOperation: vi.fn().mockResolvedValue(undefined),
        getPendingOperations: vi.fn().mockResolvedValue([]),
        removeSyncOperation: vi.fn().mockResolvedValue(undefined),
        updateSyncOperation: vi.fn().mockResolvedValue(undefined),
        setItem: vi.fn().mockResolvedValue(undefined),
        getItem: vi.fn().mockResolvedValue(undefined),
    }
}));

// Mock EventBus
vi.mock('../events', () => ({
    eventBus: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
    },
    Events: {
        PLAYBACK_STARTED: 'PLAYBACK_STARTED',
        PLAYBACK_PAUSED: 'PLAYBACK_PAUSED',
    }
}));

// Mock db for getDeviceId
vi.mock('../storage/db', () => ({
    getDeviceId: vi.fn().mockResolvedValue('test-device-id'),
}));

describe('SyncManager', () => {
    let manager: SyncManager;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset Supabase mock states
        vi.mocked(supabase.from).mockReturnThis();
        vi.mocked(supabase.select).mockReturnThis();
        vi.mocked(supabase.eq).mockReturnThis();
        vi.mocked(supabase.order).mockReturnThis();
        vi.mocked(supabase.match).mockReturnThis();
        vi.mocked(supabase.upsert).mockResolvedValue({ error: null });
        vi.mocked(supabase.single).mockResolvedValue({ data: null, error: null });

        manager = new SyncManager();
    });

    it('should enqueue operations to StorageService', async () => {
        await manager.enqueue('favorite', 'create', { media_id: '123' });
        expect(StorageService.addSyncOperation).toHaveBeenCalled();
    });

    it('should handle playback_position conflict resolution (local newer)', async () => {
        const op = {
            id: 'op1',
            type: 'playback_position',
            action: 'update',
            payload: { provider: 'saavn', media_id: 'song1', version: 10 },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            deviceId: 'test-device-id'
        };

        vi.mocked(StorageService.getPendingOperations).mockResolvedValue([op as any]);

        // Mock remote having an older version
        vi.mocked(supabase.single).mockResolvedValueOnce({
            data: { version: 5, updated_at: new Date(Date.now() - 10000).toISOString() },
            error: null
        });

        await manager.sync();

        expect(supabase.upsert).toHaveBeenCalled();
    });

    it('should handle playback_position conflict resolution (remote newer)', async () => {
        const op = {
            id: 'op1',
            type: 'playback_position',
            action: 'update',
            payload: { provider: 'saavn', media_id: 'song1', version: 5 },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            deviceId: 'test-device-id'
        };

        vi.mocked(StorageService.getPendingOperations).mockResolvedValue([op as any]);

        // Mock remote having a newer version
        vi.mocked(supabase.single).mockResolvedValueOnce({
            data: { version: 10, updated_at: new Date().toISOString() },
            error: null
        });

        await manager.sync();

        expect(supabase.upsert).not.toHaveBeenCalled();
        expect(StorageService.removeSyncOperation).toHaveBeenCalledWith('op1');
    });

    it('should retry operations on failure', async () => {
        const op = {
            id: 'op1',
            type: 'favorite',
            action: 'create',
            payload: { media_id: '123' },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            deviceId: 'test-device-id'
        };

        vi.mocked(StorageService.getPendingOperations).mockResolvedValue([op as any]);
        // Mock failure for favorite table
        vi.mocked(supabase.upsert).mockResolvedValueOnce({ error: { message: 'Network Error' } as any });

        await manager.sync();

        expect(StorageService.updateSyncOperation).toHaveBeenCalledWith(expect.objectContaining({
            id: 'op1',
            retryCount: 1
        }));
    });

    it('should drop operations after 3 failures', async () => {
        const op = {
            id: 'op1',
            type: 'favorite',
            action: 'create',
            payload: { media_id: '123' },
            createdAt: new Date().toISOString(),
            retryCount: 2,
            deviceId: 'test-device-id'
        };

        vi.mocked(StorageService.getPendingOperations).mockResolvedValue([op as any]);
        vi.mocked(supabase.upsert).mockResolvedValueOnce({ error: { message: 'Network Error' } as any });

        await manager.sync();

        expect(StorageService.removeSyncOperation).toHaveBeenCalledWith('op1');
    });

    it('should handle concurrent updates via upsert on conflict columns', async () => {
        // SyncManager uses getConflictColumns for deterministic conflict resolution at the DB level
        // For favorites, it is user_id,provider,media_id.
        // We verify that the enqueue/sync flow correctly passes these to Supabase.

        const op = {
            id: 'op-fav',
            type: 'favorite',
            action: 'create',
            payload: { media_id: 'song-123', provider: 'saavn' },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            deviceId: 'test-device-id'
        };

        vi.mocked(StorageService.getPendingOperations).mockResolvedValue([op as any]);

        await manager.sync();

        expect(supabase.from).toHaveBeenCalledWith('favorites');
        expect(supabase.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                media_id: 'song-123',
                provider: 'saavn'
            }),
            expect.objectContaining({ onConflict: 'user_id,provider,media_id' })
        );
    });
});
