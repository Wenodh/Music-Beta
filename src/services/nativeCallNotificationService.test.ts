import { afterEach, describe, expect, it, vi } from 'vitest';

const { abandonAudioFocusMock, listenerCallbacks } = vi.hoisted(() => ({
    abandonAudioFocusMock: vi.fn().mockResolvedValue(undefined),
    listenerCallbacks: {} as Record<string, (data: any) => void>,
}));

vi.mock('@capacitor/core', () => ({
    registerPlugin: vi.fn(() => ({
        abandonAudioFocus: abandonAudioFocusMock,
        addListener: vi.fn((eventName: string, callback: (data: any) => void) => {
            listenerCallbacks[eventName] = callback;
            return Promise.resolve({ remove: vi.fn() });
        }),
    })),
}));

describe('NativeCallNotificationService audio focus ownership', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
        Object.keys(listenerCallbacks).forEach((key) => delete listenerCallbacks[key]);
        vi.clearAllMocks();
    });

    it('routes only call-owned audio focus events to the call lifecycle', async () => {
        vi.stubGlobal('window', {
            Capacitor: { isNativePlatform: () => true },
        });
        const { nativeCallNotificationService } = await import('./nativeCallNotificationService');
        const onFocusLost = vi.fn();
        const onFocusGained = vi.fn();

        await nativeCallNotificationService.setupAudioLifecycleListeners({
            onFocusLost,
            onFocusGained,
            onBecomingNoisy: vi.fn(),
        });

        listenerCallbacks.audioFocusChanged({ event: 'audioFocusLost', forCall: false });
        listenerCallbacks.audioFocusChanged({ event: 'audioFocusGained', forCall: false });
        expect(onFocusLost).not.toHaveBeenCalled();
        expect(onFocusGained).not.toHaveBeenCalled();

        listenerCallbacks.audioFocusChanged({ event: 'audioFocusLost', forCall: true });
        listenerCallbacks.audioFocusChanged({ event: 'audioFocusGained', forCall: true });
        expect(onFocusLost).toHaveBeenCalledOnce();
        expect(onFocusGained).toHaveBeenCalledOnce();
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
