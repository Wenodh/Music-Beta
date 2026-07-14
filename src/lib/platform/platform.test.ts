import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformIntegrationManager } from './PlatformIntegrationManager';

describe('PlatformIntegrationManager', () => {
    let manager: PlatformIntegrationManager;

    beforeEach(() => {
        manager = PlatformIntegrationManager.getInstance();
    });

    it('should be a singleton', () => {
        const i1 = PlatformIntegrationManager.getInstance();
        const i2 = PlatformIntegrationManager.getInstance();
        expect(i1).toBe(i2);
    });

    it('should report registered capabilities', () => {
        const mockAdapter = {
            id: 'test-adapter',
            initialize: vi.fn(),
            getCapabilities: vi.fn().mockReturnValue({ cast: true }),
        };
        manager.registerAdapter(mockAdapter as any);
        expect(manager.getCapabilities().cast).toBe(true);
    });
});
