import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nativeMediaSession, MediaControlsCallbacks } from './nativeMediaSessionService';

const { requestAudioFocusMock } = vi.hoisted(() => ({
    requestAudioFocusMock: vi.fn().mockResolvedValue({ granted: true }),
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
    registerPlugin: vi.fn(() => ({
        requestAudioFocus: requestAudioFocusMock,
        abandonAudioFocus: vi.fn().mockResolvedValue(undefined),
        addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    })),
}));

vi.mock('@capgo/capacitor-media-session', () => ({
    MediaSession: {
        setActionHandler: vi.fn().mockResolvedValue(undefined),
        setMetadata: vi.fn().mockResolvedValue(undefined),
        setPlaybackState: vi.fn().mockResolvedValue(undefined),
        setPositionState: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('NativeMediaSessionBridge', () => {
    beforeEach(async () => {
        await nativeMediaSession.cleanup();
        vi.clearAllMocks();
    });

    it('registers media action handlers and audio focus listeners', async () => {
        const callbacks: MediaControlsCallbacks = {
            onPlay: vi.fn(),
            onPause: vi.fn(),
            onNext: vi.fn(),
            onPrevious: vi.fn(),
            onSeek: vi.fn(),
        };

        await nativeMediaSession.registerCallbacks(callbacks);
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        expect(MediaSession.setActionHandler).toHaveBeenCalledWith({ action: 'play' }, expect.any(Function));
        expect(MediaSession.setActionHandler).toHaveBeenCalledWith({ action: 'pause' }, expect.any(Function));
        expect(MediaSession.setActionHandler).toHaveBeenCalledWith({ action: 'nexttrack' }, expect.any(Function));
        expect(MediaSession.setActionHandler).toHaveBeenCalledWith({ action: 'previoustrack' }, expect.any(Function));
    });

    it('updates metadata with decoded song attributes', async () => {
        const mockSong: any = {
            id: 's1',
            name: 'Song &amp; Melody',
            primaryArtists: 'Artist 1 &amp; 2',
            album: { name: 'Great Album' },
        };

        await nativeMediaSession.updateMetadata(mockSong, 'https://example.com/cover.jpg');
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        expect(MediaSession.setMetadata).toHaveBeenCalledWith({
            title: 'Song & Melody',
            artist: 'Artist 1 & 2',
            album: 'Great Album',
            artwork: [{ src: 'https://example.com/cover.jpg', sizes: '512x512', type: 'image/png' }],
        });
    });

    it('starts the media foreground service before requesting media audio focus', async () => {
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        const accepted = await nativeMediaSession.updatePlaybackState(true);

        expect(accepted).toBe(true);
        expect(MediaSession.setPlaybackState).toHaveBeenCalledWith({ playbackState: 'playing' });
        expect(requestAudioFocusMock).toHaveBeenCalledWith({ forCall: false });
        expect(MediaSession.setPlaybackState.mock.invocationCallOrder[0])
            .toBeLessThan(requestAudioFocusMock.mock.invocationCallOrder[0]);

        await nativeMediaSession.updatePlaybackState(false);
        expect(MediaSession.setPlaybackState).toHaveBeenCalledWith({ playbackState: 'paused' });
    });

    it('reports denied media focus and rolls the native session back to paused', async () => {
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        requestAudioFocusMock.mockResolvedValueOnce({ granted: false });

        const accepted = await nativeMediaSession.updatePlaybackState(true);

        expect(accepted).toBe(false);
        expect(MediaSession.setPlaybackState).toHaveBeenNthCalledWith(1, { playbackState: 'playing' });
        expect(MediaSession.setPlaybackState).toHaveBeenNthCalledWith(2, { playbackState: 'paused' });
    });

    it('updates position state correctly', async () => {
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        await nativeMediaSession.updatePositionState(240, 60, 1.0);
        expect(MediaSession.setPositionState).toHaveBeenCalledWith({
            duration: 240,
            position: 60,
            playbackRate: 1.0,
        });
    });

    it('cleans up handlers and resets playback state', async () => {
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        await nativeMediaSession.cleanup();
        expect(MediaSession.setPlaybackState).toHaveBeenCalledWith({ playbackState: 'none' });
    });
});
