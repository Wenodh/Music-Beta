import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { iceServerService } from './iceServerService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
    supabase: {
        functions: {
            invoke: vi.fn(),
        },
    },
}));

describe('IceServerService Unit Tests (Task 3)', () => {
    beforeEach(() => {
        iceServerService.clearCache();
        iceServerService.setForceRelay(false);
        vi.clearAllMocks();
    });

    afterEach(() => {
        iceServerService.clearCache();
    });

    it('1. Returns default STUN servers when Edge Function is not present', async () => {
        (supabase.functions.invoke as any).mockResolvedValue({
            data: null,
            error: new Error('Function not deployed'),
        });

        const config = await iceServerService.getIceServers();
        expect(config.iceServers).toBeDefined();
        expect(config.iceServers.length).toBeGreaterThanOrEqual(2);
        expect(config.iceServers[0].urls).toContain('stun:stun.l.google.com:19302');
        expect(config.iceTransportPolicy).toBe('all');
    });

    it('2. Enforces iceTransportPolicy: relay when forceRelay is enabled', async () => {
        iceServerService.setForceRelay(true);
        expect(iceServerService.isForceRelay()).toBe(true);

        const config = await iceServerService.getIceServers();
        expect(config.iceTransportPolicy).toBe('relay');
    });

    it('3. Fetches and caches dynamic TURN credentials from backend function', async () => {
        const mockTurnServers = [
            { urls: 'turn:turn.vibeon.app:3478?transport=udp', username: 'temp-user', credential: 'temp-password' },
            { urls: 'turn:turn.vibeon.app:443?transport=tcp', username: 'temp-user', credential: 'temp-password' },
        ];

        (supabase.functions.invoke as any).mockResolvedValue({
            data: { iceServers: mockTurnServers },
            error: null,
        });

        const config = await iceServerService.getIceServers();
        expect(supabase.functions.invoke).toHaveBeenCalledWith('get-ice-servers');
        expect(config.iceServers).toEqual(mockTurnServers);

        // Subsequent call within TTL should return cached config without extra invocation
        const secondConfig = await iceServerService.getIceServers();
        expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
        expect(secondConfig.iceServers).toEqual(mockTurnServers);
    });

    it('4. Refreshes expired credentials after TTL', async () => {
        const mockTurnServersInitial = [
            { urls: 'turn:initial.relay:3478', username: 'user1', credential: 'pw1' },
        ];
        const mockTurnServersRefreshed = [
            { urls: 'turn:refreshed.relay:3478', username: 'user2', credential: 'pw2' },
        ];

        (supabase.functions.invoke as any)
            .mockResolvedValueOnce({
                data: { iceServers: mockTurnServersInitial },
                error: null,
            })
            .mockResolvedValueOnce({
                data: { iceServers: mockTurnServersRefreshed },
                error: null,
            });

        const initial = await iceServerService.getIceServers();
        expect(initial.iceServers).toEqual(mockTurnServersInitial);

        // Force cache invalidation simulating TTL expiration
        iceServerService.clearCache();

        const refreshed = await iceServerService.getIceServers();
        expect(refreshed.iceServers).toEqual(mockTurnServersRefreshed);
        expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
});
