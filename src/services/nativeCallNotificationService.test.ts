import { afterEach, describe, expect, it, vi } from 'vitest';

const { abandonAudioFocusMock } = vi.hoisted(() => ({
    abandonAudioFocusMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@capacitor/core', () => ({
    registerPlugin: vi.fn(() => ({
        abandonAudioFocus: abandonAudioFocusMock,
    })),
}));

describe('NativeCallNotificationService audio focus ownership', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('releases call focus without releasing the media focus owner', async () => {
        vi.stubGlobal('window', {
            Capacitor: { isNativePlatform: () => true },
        });
        const { nativeCallNotificationService } = await import('./nativeCallNotificationService');

        await nativeCallNotificationService.abandonAudioFocus();

        expect(abandonAudioFocusMock).toHaveBeenCalledWith({ forCall: true });
    });
});
