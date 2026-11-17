import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nativeMediaSession, MediaControlsCallbacks } from './nativeMediaSessionService';

const { requestAudioFocusMock, abandonAudioFocusMock, listenerCallbacks } = vi.hoisted(() => ({
    requestAudioFocusMock: vi.fn().mockResolvedValue({ granted: true }),
    abandonAudioFocusMock: vi.fn().mockResolvedValue(undefined),
    listenerCallbacks: {} as Record<string, (data: any) => void>,
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
    registerPlugin: vi.fn(() => ({
        requestAudioFocus: requestAudioFocusMock,
        abandonAudioFocus: abandonAudioFocusMock,
        addListener: vi.fn((eventName: string, callback: (data: any) => void) => {
            listenerCallbacks[eventName] = callback;
            return Promise.resolve({ remove: vi.fn() });
        }),
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
        Object.keys(listenerCallbacks).forEach((key) => delete listenerCallbacks[key]);
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

    it('resumes only after a transient audio-focus interruption is restored', async () => {
        const callbacks: MediaControlsCallbacks = {
            onPlay: vi.fn(),
            onPause: vi.fn(),
            onNext: vi.fn(),
            onPrevious: vi.fn(),
            onSeek: vi.fn(),
            onAudioFocusLost: vi.fn(),
            onAudioFocusGained: vi.fn(),
        };

        await nativeMediaSession.registerCallbacks(callbacks);
        listenerCallbacks.audioFocusChanged({ event: 'audioFocusLost', canResume: true });
        expect(callbacks.onAudioFocusLost).toHaveBeenCalledOnce();

        listenerCallbacks.audioFocusChanged({ event: 'audioFocusGained' });
        expect(callbacks.onAudioFocusGained).toHaveBeenCalledOnce();

        listenerCallbacks.audioFocusChanged({ event: 'audioFocusLost', canResume: false, forCall: false });
        listenerCallbacks.audioFocusChanged({ event: 'audioFocusGained', forCall: false });
        expect(callbacks.onAudioFocusGained).toHaveBeenCalledOnce();

        // Call focus events must never trigger media-player pause/resume callbacks.
        listenerCallbacks.audioFocusChanged({ event: 'audioFocusLost', canResume: true, forCall: true });
        listenerCallbacks.audioFocusChanged({ event: 'audioFocusGained', forCall: true });
        expect(callbacks.onAudioFocusLost).toHaveBeenCalledOnce();
        expect(callbacks.onAudioFocusGained).toHaveBeenCalledOnce();
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
            artwork: [{ src: 'https://example.com/cover.jpg', sizes: '512x512', type: 'image/jpeg' }],
        });
    });

    it('does not guess the MIME type for opaque CDN artwork URLs', async () => {
        const mockSong: any = {
            id: 's2',
            name: 'Opaque Artwork',
            primaryArtists: 'Artist',
            album: 'Album',
        };

        await nativeMediaSession.updateMetadata(mockSong, 'https://cdn.example/image?id=opaque');
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        const metadata = (MediaSession.setMetadata as any).mock.calls[0][0];
        expect(metadata.artwork).toEqual([
            { src: 'https://cdn.example/image?id=opaque', sizes: '512x512' },
        ]);
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

    it('abandons media audio focus on a normal pause', async () => {
        await nativeMediaSession.updatePlaybackState(false);
        expect(abandonAudioFocusMock).toHaveBeenCalledWith({ forCall: false });
    });

    it('reports denied media focus and rolls the native session back to paused', async () => {
        const { MediaSession } = await import('@capgo/capacitor-media-session');
        requestAudioFocusMock.mockResolvedValueOnce({ granted: false });

        const accepted = await nativeMediaSession.updatePlaybackState(true);

        expect(accepted).toBe(false);
        expect(MediaSession.setPlaybackState).toHaveBeenNthCalledWith(1, { playbackState: 'playing' });
        expect(MediaSession.setPlaybackState).toHaveBeenNthCalledWith(2, { playbackState: 'paused' });
    });

    it('supports browser seek-forward and seek-backward actions using the latest position', async () => {
        const handlers = new Map<string, ((details?: any) => void) | null>();
        const mediaSession = {
            setActionHandler: vi.fn((action: string, handler: ((details?: any) => void) | null) => {
                handlers.set(action, handler);
            }),
            setPositionState: vi.fn(),
            playbackState: 'none',
            metadata: null,
        };
        vi.stubGlobal('window', {});
        vi.stubGlobal('navigator', { mediaSession });

        try {
            const callbacks: MediaControlsCallbacks = {
                onPlay: vi.fn(),
                onPause: vi.fn(),
                onNext: vi.fn(),
                onPrevious: vi.fn(),
                onSeek: vi.fn(),
            };

            await nativeMediaSession.registerCallbacks(callbacks);
            await nativeMediaSession.updatePositionState(120, 30, 1);

            handlers.get('seekbackward')?.({ seekOffset: 10 });
            handlers.get('seekforward')?.({ seekOffset: 20 });

            expect(callbacks.onSeek).toHaveBeenNthCalledWith(1, 20);
            expect(callbacks.onSeek).toHaveBeenNthCalledWith(2, 50);
            expect(handlers.has('stop')).toBe(true);
        } finally {
            vi.unstubAllGlobals();
        }
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
