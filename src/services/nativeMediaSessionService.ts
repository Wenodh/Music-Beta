import { Capacitor, registerPlugin } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { Song } from '../types/music';

interface VibeOnMediaPluginInterface {
    requestAudioFocus(options?: { forCall?: boolean }): Promise<{ granted: boolean }>;
    abandonAudioFocus(): Promise<void>;
    checkPermissions?(): Promise<{ notifications: string }>;
    requestPermissions?(): Promise<{ notifications: string }>;
    addListener(eventName: 'audioFocusChanged', listener: (data: { event: string; canResume?: boolean }) => void): Promise<{ remove: () => void }>;
    addListener(eventName: 'becomingNoisy', listener: (data: { event: string }) => void): Promise<{ remove: () => void }>;
}

const VibeOnMedia = registerPlugin<VibeOnMediaPluginInterface>('VibeOnMedia');

export interface MediaControlsCallbacks {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek: (seconds: number) => void;
    onHeadphonesDisconnected?: () => void;
    onAudioFocusLost?: () => void;
    onAudioFocusGained?: () => void;
}

class NativeMediaSessionBridge {
    private isNative = Capacitor.isNativePlatform();
    private activeHandlers: MediaControlsCallbacks | null = null;
    private listenersRegistered = false;
    private removeFocusListener: (() => void) | null = null;
    private removeNoisyListener: (() => void) | null = null;
    private resumeAfterTransientFocusLoss = false;

    public async checkAndRequestNotificationPermissions(): Promise<boolean> {
        if (!this.isNative) return true;

        try {
            if (typeof VibeOnMedia.checkPermissions === 'function') {
                const status = await VibeOnMedia.checkPermissions();
                if (status.notifications === 'granted') {
                    return true;
                }
                if (typeof VibeOnMedia.requestPermissions === 'function') {
                    const result = await VibeOnMedia.requestPermissions();
                    return result.notifications === 'granted';
                }
            }
        } catch (err) {
            console.warn('[NativeMediaSession] Notification permission check/request ignored or unsupported:', err);
        }
        return false;
    }

    public async registerCallbacks(callbacks: MediaControlsCallbacks) {
        this.activeHandlers = callbacks;

        if (this.isNative) {
            try {
                await MediaSession.setActionHandler({ action: 'play' }, () => {
                    this.activeHandlers?.onPlay();
                });
                await MediaSession.setActionHandler({ action: 'pause' }, () => {
                    this.activeHandlers?.onPause();
                });
                await MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
                    this.activeHandlers?.onNext();
                });
                await MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
                    this.activeHandlers?.onPrevious();
                });
                await MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
                    if (details?.seekTime !== undefined && details.seekTime !== null) {
                        this.activeHandlers?.onSeek(details.seekTime);
                    }
                });

                if (!this.listenersRegistered) {
                    const focusHandle = await VibeOnMedia.addListener('audioFocusChanged', (data) => {
                        if (data.event === 'audioFocusLost') {
                            this.resumeAfterTransientFocusLoss = Boolean(data.canResume);
                            if (this.activeHandlers?.onAudioFocusLost) {
                                this.activeHandlers.onAudioFocusLost();
                            } else {
                                this.activeHandlers?.onPause();
                            }
                        } else if (data.event === 'audioFocusGained' && this.resumeAfterTransientFocusLoss) {
                            this.resumeAfterTransientFocusLoss = false;
                            this.activeHandlers?.onAudioFocusGained?.();
                        }
                    });
                    this.removeFocusListener = focusHandle.remove;

                    const noisyHandle = await VibeOnMedia.addListener('becomingNoisy', () => {
                        if (this.activeHandlers?.onHeadphonesDisconnected) {
                            this.activeHandlers.onHeadphonesDisconnected();
                        } else {
                            this.activeHandlers?.onPause();
                        }
                    });
                    this.removeNoisyListener = noisyHandle.remove;

                    this.listenersRegistered = true;
                }
            } catch (err) {
                console.warn('[NativeMediaSession] Failed to configure native handlers:', err);
            }
        }

        // Browser Media Session API. Register each action independently because
        // browser support differs (especially for seek and stop actions).
        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
            const mediaSession = navigator.mediaSession;
            const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
                try {
                    mediaSession.setActionHandler(action, handler);
                } catch {
                    // An unsupported action must not prevent the other controls registering.
                }
            };

            setHandler('play', () => this.activeHandlers?.onPlay());
            setHandler('pause', () => this.activeHandlers?.onPause());
            setHandler('stop', () => this.activeHandlers?.onPause());
            setHandler('nexttrack', () => this.activeHandlers?.onNext());
            setHandler('previoustrack', () => this.activeHandlers?.onPrevious());
            setHandler('seekto', (details) => {
                if (Number.isFinite(details.seekTime)) {
                    this.activeHandlers?.onSeek(details.seekTime!);
                }
            });
            setHandler('seekbackward', (details) => {
                const current = Number.isFinite(details.seekTime)
                    ? details.seekTime!
                    : 0;
                const offset = Number.isFinite(details.seekOffset) && details.seekOffset! > 0
                    ? details.seekOffset!
                    : 10;
                this.activeHandlers?.onSeek(Math.max(0, current - offset));
            });
            setHandler('seekforward', (details) => {
                const current = Number.isFinite(details.seekTime)
                    ? details.seekTime!
                    : 0;
                const offset = Number.isFinite(details.seekOffset) && details.seekOffset! > 0
                    ? details.seekOffset!
                    : 10;
                this.activeHandlers?.onSeek(current + offset);
            });
        }
    }

    public async updateMetadata(song: Song | null, imageUrl: string | null) {
        if (!song) {
            if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
            }
            return;
        }

        const title = decodeHtmlEntities(song.name);
        const artist = decodeHtmlEntities(song.primaryArtists || '');
        const album = decodeHtmlEntities(typeof song.album === 'string' ? song.album : song.album?.name || '');
        const artworkType = (() => {
            if (!imageUrl) return 'image/jpeg';
            try {
                const pathname = new URL(imageUrl, typeof window !== 'undefined' ? window.location.href : 'https://vibeon.invalid').pathname.toLowerCase();
                if (pathname.endsWith('.png')) return 'image/png';
                if (pathname.endsWith('.webp')) return 'image/webp';
                if (pathname.endsWith('.avif')) return 'image/avif';
                if (pathname.endsWith('.gif')) return 'image/gif';
            } catch {
                // Use the broadly supported JPEG fallback for opaque/blob URLs.
            }
            return 'image/jpeg';
        })();
        const artwork = imageUrl
            ? [{ src: imageUrl, sizes: '512x512', type: artworkType }]
            : [];

        if (this.isNative) {
            try {
                await MediaSession.setMetadata({
                    title,
                    artist,
                    album,
                    artwork,
                });
            } catch (err) {
                console.warn('[NativeMediaSession] Failed to set native metadata:', err);
            }
        }

        if (typeof window !== 'undefined' && 'mediaSession' in navigator && (window as any).MediaMetadata) {
            try {
                navigator.mediaSession.metadata = new (window as any).MediaMetadata({
                    title,
                    artist,
                    album,
                    artwork,
                });
            } catch {
                // Suppress browser MediaMetadata error
            }
        }
    }

    public async updatePlaybackState(isPlaying: boolean): Promise<boolean> {
        const state = isPlaying ? 'playing' : 'paused';

        if (this.isNative) {
            try {
                // Set the playing state first: on Android this starts the plugin's mediaPlayback
                // foreground service. Requesting focus first creates a window where a fast screen
                // lock can happen before Android has promoted the app to a foreground service.
                await MediaSession.setPlaybackState({ playbackState: state });

                if (isPlaying) {
                    const focus = await VibeOnMedia.requestAudioFocus({ forCall: false });
                    if (!focus?.granted) {
                        await MediaSession.setPlaybackState({ playbackState: 'paused' });
                        return false;
                    }
                } else if (!this.resumeAfterTransientFocusLoss) {
                    // Release focus on a user/permanent pause, but retain it during a transient
                    // interruption so Android can notify us when focus is returned.
                    await VibeOnMedia.abandonAudioFocus().catch(() => {});
                }
            } catch (err) {
                console.warn('[NativeMediaSession] Failed to set native playback state:', err);
                if (isPlaying) return false;
            }
        }

        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
            try {
                navigator.mediaSession.playbackState = state;
            } catch {
                // Ignore
            }
        }
        return true;
    }

    public cancelTransientResume() {
        this.resumeAfterTransientFocusLoss = false;
    }

    public async updatePositionState(duration: number, position: number, playbackRate = 1.0) {
        if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;

        const safeDuration = duration;
        const safePosition = Math.min(safeDuration, Math.max(0, position));
        const safePlaybackRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1.0;
        const positionState = {
            duration: safeDuration,
            position: safePosition,
            playbackRate: safePlaybackRate,
        };

        if (this.isNative) {
            try {
                await MediaSession.setPositionState(positionState);
            } catch {
                // Ignore position updates if service is busy or the duration is not yet accepted.
            }
        }

        if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState(positionState);
            } catch {
                // Browsers reject invalid or stale position updates; playback itself should continue.
            }
        }
    }

    public async cleanup() {
        if (this.isNative) {
            try {
                await MediaSession.setPlaybackState({ playbackState: 'none' });
                await VibeOnMedia.abandonAudioFocus().catch(() => {});
            } catch {
                // Ignore
            }
        }
        if (this.removeFocusListener) {
            this.removeFocusListener();
            this.removeFocusListener = null;
        }
        if (this.removeNoisyListener) {
            this.removeNoisyListener();
            this.removeNoisyListener = null;
        }
        this.listenersRegistered = false;
        this.resumeAfterTransientFocusLoss = false;
        this.activeHandlers = null;
    }
}

export const nativeMediaSession = new NativeMediaSessionBridge();
