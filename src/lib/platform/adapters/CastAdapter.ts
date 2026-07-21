import { PlatformAdapter, PlatformCapabilities, RemotePlaybackProvider, PlaybackDevice } from '../types';
import { playbackManager } from '../../playback/PlaybackManager';
import { deviceDiscoveryService } from '../DeviceDiscoveryService';

export class CastAdapter implements PlatformAdapter, RemotePlaybackProvider {
    id = 'cast';
    private castContext: any = null;
    private castSession: any = null;
    private eventCallback: ((event: string, data: any) => void) | null = null;

    async initialize() {
        // Load Cast SDK script if not present
        if (!(window as any).chrome?.cast) {
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
            document.head.appendChild(script);
        }

        window.__onGCastApiAvailable = (isAvailable: boolean) => {
            if (isAvailable) {
                this.initCast();
            }
        };
    }

    private initCast() {
        const cast = (window as any).cast;
        const chrome = (window as any).chrome;

        this.castContext = cast.framework.CastContext.getInstance();
        this.castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });

        this.castContext.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event: any) => {
                const state = event.sessionState;
                if (state === cast.framework.SessionState.SESSION_STARTED) {
                    this.castSession = this.castContext.getCurrentSession();
                    this.setupSessionListeners();
                    playbackManager.setRemoteMode(this);
                } else if (state === cast.framework.SessionState.SESSION_ENDED) {
                    this.castSession = null;
                    playbackManager.setRemoteMode(null);
                }
            }
        );

        this.castContext.addEventListener(
            cast.framework.CastContextEventType.CAST_STATE_CHANGED,
            (event: any) => {
                if (event.castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE) {
                    deviceDiscoveryService.registerDevice({
                        id: 'google-cast',
                        name: 'Google Cast',
                        type: 'chromecast',
                        capabilities: { cast: true, mediaSession: true },
                        state: 'available',
                        provider: this
                    });
                } else {
                    deviceDiscoveryService.removeDevice('google-cast');
                }
            }
        );
    }

    private setupSessionListeners() {
        const chrome = (window as any).chrome;
        const media = this.castSession.getMediaSession();
        if (media) {
            media.addUpdateListener(() => {
                const playerState = media.playerState;
                const stateMap: any = {
                    'PLAYING': 'playing',
                    'PAUSED': 'paused',
                    'BUFFERING': 'buffering',
                    'IDLE': 'idle'
                };
                if (this.eventCallback) {
                    this.eventCallback('state', stateMap[playerState] || 'idle');
                    this.eventCallback('progress', {
                        currentTime: media.getEstimatedTime(),
                        duration: media.media.duration
                    });
                }
            });
        }
    }

    // RemotePlaybackProvider implementation
    async connect(device: PlaybackDevice): Promise<void> {
        await this.castContext.requestSession();
    }

    async disconnect(): Promise<void> {
        await this.castContext.endCurrentSession(true);
    }

    async load(item: any): Promise<void> {
        if (!this.castSession) return;
        const chrome = (window as any).chrome;
        const mediaInfo = new chrome.cast.media.MediaInfo(item.stream.url, 'audio/mpeg');
        mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
        mediaInfo.metadata.title = item.title;
        mediaInfo.metadata.artist = item.artist;
        if (item.artwork?.[0]?.url) {
            mediaInfo.metadata.images = [{ url: item.artwork[0].url }];
        }

        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        await this.castSession.loadMedia(request);
        this.setupSessionListeners(); // Re-bind to the new media session
    }

    async play(): Promise<void> {
        this.castSession?.getMediaSession()?.play();
    }

    async pause(): Promise<void> {
        this.castSession?.getMediaSession()?.pause();
    }

    async seek(time: number): Promise<void> {
        const chrome = (window as any).chrome;
        const seekRequest = new chrome.cast.media.SeekRequest();
        seekRequest.currentTime = time;
        this.castSession?.getMediaSession()?.seek(seekRequest);
    }

    async setVolume(volume: number): Promise<void> {
        this.castContext.setVolume(volume);
    }

    onEvent(callback: (event: string, data: any) => void): void {
        this.eventCallback = callback;
    }

    destroy() {
        // Cleanup
    }

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            cast: !!(window as any).chrome?.cast || !!(window as any).__onGCastApiAvailable
        };
    }
}
