import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nativeMediaSession, MediaControlsCallbacks } from './nativeMediaSessionService';

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
    registerPlugin: vi.fn(() => ({
        requestAudioFocus: vi.fn().mockResolvedValue({ granted: true }),
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
        vi.clearAllMocks();
        await nativeMediaSession.cleanup();
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

    it('updates playback state and requests audio focus on play', async () => {
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        await nativeMediaSession.updatePlaybackState(true);
        expect(MediaSession.setPlaybackState).toHaveBeenCalledWith({ playbackState: 'playing' });

        await nativeMediaSession.updatePlaybackState(false);
        expect(MediaSession.setPlaybackState).toHaveBeenCalledWith({ playbackState: 'paused' });
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
