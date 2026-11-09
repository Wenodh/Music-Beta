import { Capacitor, registerPlugin } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { Song } from '../types/music';

interface VibeOnMediaPluginInterface {
    requestAudioFocus(): Promise<{ granted: boolean }>;
    abandonAudioFocus(): Promise<void>;
    checkPermissions?(): Promise<{ notifications: string }>;
    requestPermissions?(): Promise<{ notifications: string }>;
    addListener(eventName: 'audioFocusChanged', listener: (data: { event: string }) => void): Promise<{ remove: () => void }>;
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
}

class NativeMediaSessionBridge {
    private isNative = Capacitor.isNativePlatform();
    private activeHandlers: MediaControlsCallbacks | null = null;
    private listenersRegistered = false;
    private removeFocusListener: (() => void) | null = null;
    private removeNoisyListener: (() => void) | null = null;

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
                            if (this.activeHandlers?.onAudioFocusLost) {
                                this.activeHandlers.onAudioFocusLost();
                            } else {
                                this.activeHandlers?.onPause();
                            }
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

        // Web MediaSession fallback
        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
            try {
                navigator.mediaSession.setActionHandler('play', () => this.activeHandlers?.onPlay());
                navigator.mediaSession.setActionHandler('pause', () => this.activeHandlers?.onPause());
                navigator.mediaSession.setActionHandler('nexttrack', () => this.activeHandlers?.onNext());
                navigator.mediaSession.setActionHandler('previoustrack', () => this.activeHandlers?.onPrevious());
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.seekTime !== undefined && details.seekTime !== null) {
                        this.activeHandlers?.onSeek(details.seekTime);
                    }
                });
            } catch {
                // Ignore unsupported action handler errors
            }
        }
    }

    public async updateMetadata(song: Song | null, imageUrl: string | null) {
        if (!song) return;

        const title = decodeHtmlEntities(song.name);
        const artist = decodeHtmlEntities(song.primaryArtists || '');
        const album = decodeHtmlEntities(typeof song.album === 'string' ? song.album : song.album?.name || '');
        const artwork = imageUrl
            ? [{ src: imageUrl, sizes: '512x512', type: 'image/png' }]
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

    public async updatePlaybackState(isPlaying: boolean) {
        const state = isPlaying ? 'playing' : 'paused';

        if (this.isNative) {
            try {
                if (isPlaying) {
                    await VibeOnMedia.requestAudioFocus().catch(() => {});
                }
                await MediaSession.setPlaybackState({ playbackState: state });
            } catch (err) {
                console.warn('[NativeMediaSession] Failed to set native playback state:', err);
            }
        }

        if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
            try {
                navigator.mediaSession.playbackState = state;
            } catch {
                // Ignore
            }
        }
    }

    public async updatePositionState(duration: number, position: number, playbackRate = 1.0) {
        if (this.isNative) {
            try {
                await MediaSession.setPositionState({
                    duration: duration > 0 ? duration : 0,
                    position: position > 0 ? position : 0,
                    playbackRate: playbackRate > 0 ? playbackRate : 1.0,
                });
            } catch {
                // Ignore position updates if service is busy
            }
        }

        if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: duration > 0 ? duration : 0,
                    position: position > 0 ? position : 0,
                    playbackRate: playbackRate > 0 ? playbackRate : 1.0,
                });
            } catch {
                // Ignore
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
        this.activeHandlers = null;
    }
}

export const nativeMediaSession = new NativeMediaSessionBridge();
