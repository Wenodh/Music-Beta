import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncManager } from './SyncManager';

// Mock Supabase
vi.mock('../supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null } })
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
    }
}));

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

describe('SyncManager', () => {
    let manager: SyncManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new SyncManager();
    });

    it('should be able to get device ID', () => {
        expect(manager.getDeviceId()).toBeDefined();
    });
});
