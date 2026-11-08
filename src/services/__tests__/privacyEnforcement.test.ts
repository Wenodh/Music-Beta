import { describe, it, expect, beforeEach, vi } from 'vitest';
import { iceServerService } from '../webrtc/iceServerService';
import { socialService } from '../socialService';
import { supabase } from '../../lib/supabase';

describe('Batch 1: Privacy & Settings Architecture Enforcement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        iceServerService.clearCache();
        iceServerService.setForceRelay(false);
    });

    describe('protectIpInCalls & ICE Transport Policy', () => {
        it('defaults to all candidates policy when protectIpInCalls is disabled', async () => {
            iceServerService.setForceRelay(false);
            const initial = iceServerService.getInitialIceServers();
            expect(initial.iceTransportPolicy).toBe('all');

            const resolved = await iceServerService.getIceServers();
            expect(resolved.iceTransportPolicy).toBe('all');
        });

        it('strictly enforces relay-only transport policy when protectIpInCalls is enabled', async () => {
            iceServerService.setForceRelay(true);
            const initial = iceServerService.getInitialIceServers();
            expect(initial.iceTransportPolicy).toBe('relay');

            const resolved = await iceServerService.getIceServers();
            expect(resolved.iceTransportPolicy).toBe('relay');
            expect(iceServerService.isForceRelay()).toBe(true);
        });
    });

    describe('socialService.updateProfile & Auth metadata synchronization', () => {
        it('updates profiles as source of truth and syncs auth metadata safely', async () => {
            const mockProfile = {
                id: 'test-user-123',
                username: 'vibe_master',
                display_name: 'Vibe Master',
                avatar_url: 'https://example.com/avatar.png',
                bio: 'Music lover',
                is_private: true,
                share_activity: false,
                show_online: false,
                allow_discovery: false,
                updated_at: new Date().toISOString(),
            };

            const singleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
            const selectMock = vi.fn().mockReturnValue({ single: singleMock });
            const eqMock = vi.fn().mockReturnValue({ select: selectMock });
            const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
            const fromMock = vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as any);

            const authUpdateUserMock = vi.spyOn(supabase.auth, 'updateUser').mockResolvedValue({
                data: { user: {} as any },
                error: null,
            });

            const res = await socialService.updateProfile('test-user-123', {
                display_name: 'Vibe Master',
                avatar_url: 'https://example.com/avatar.png',
                is_private: true,
                share_activity: false,
            });

            expect(fromMock).toHaveBeenCalledWith('profiles');
            expect(res.success).toBe(true);
            expect(res.data).toEqual(mockProfile);

            // Verify auth user metadata sync was called with only relevant keys
            expect(authUpdateUserMock).toHaveBeenCalledWith({
                data: {
                    full_name: 'Vibe Master',
                    avatar_url: 'https://example.com/avatar.png',
                },
            });
        });

        it('returns error and avoids auth metadata update if profile update fails', async () => {
            const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
            const selectMock = vi.fn().mockReturnValue({ single: singleMock });
            const eqMock = vi.fn().mockReturnValue({ select: selectMock });
            const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
            vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as any);

            const authUpdateUserMock = vi.spyOn(supabase.auth, 'updateUser');

            const res = await socialService.updateProfile('test-user-123', {
                display_name: 'New Name',
            });

            expect(res.success).toBe(false);
            expect(res.error).toBe('Database error');
            expect(authUpdateUserMock).not.toHaveBeenCalled();
        });
    });
});
