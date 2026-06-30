import { PlatformAdapter, PlatformCapabilities } from '../types';
import { commandDispatcher } from '../CommandDispatcher';
import { eventBus, Events } from '../../events';
import { MediaItem } from '../../audio-sdk/models';
import { decodeHtmlEntities } from '../../../utils/decodeHtml';

export class MediaSessionAdapter implements PlatformAdapter {
    id = 'media-session';

    async initialize() {
        if (!('mediaSession' in navigator)) return;

        this.setupListeners();
        this.setupActionHandlers();
    }

    private setupListeners() {
        eventBus.on(Events.TRACK_CHANGED, (item: MediaItem) => {
            this.updateMetadata(item);
        });

        eventBus.on(Events.PLAYBACK_STARTED, () => {
            navigator.mediaSession.playbackState = 'playing';
        });

        eventBus.on(Events.PLAYBACK_PAUSED, () => {
            navigator.mediaSession.playbackState = 'paused';
        });

        eventBus.on(Events.PLAYBACK_PROGRESS, ({ currentTime, duration }) => {
            if ('setPositionState' in navigator.mediaSession) {
                navigator.mediaSession.setPositionState({
                    duration: duration || 0,
                    playbackRate: 1, // could be dynamic
                    position: currentTime || 0
                });
            }
        });
    }

    private setupActionHandlers() {
        const ms = navigator.mediaSession;

        ms.setActionHandler('play', () => commandDispatcher.dispatch('play'));
        ms.setActionHandler('pause', () => commandDispatcher.dispatch('pause'));
        ms.setActionHandler('nexttrack', () => commandDispatcher.dispatch('next'));
        ms.setActionHandler('previoustrack', () => commandDispatcher.dispatch('previous'));
        ms.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) {
                commandDispatcher.dispatch('seek', { value: details.seekTime });
            }
        });

        // Optional handlers
        try {
            ms.setActionHandler('stop', () => commandDispatcher.dispatch('pause'));
            ms.setActionHandler('seekbackward', (details) => {
                const skipTime = details.seekOffset || 10;
                // need current time... maybe dispatch a relative seek command?
                eventBus.emit('COMMAND_SEEK_RELATIVE', -skipTime);
            });
            ms.setActionHandler('seekforward', (details) => {
                const skipTime = details.seekOffset || 10;
                eventBus.emit('COMMAND_SEEK_RELATIVE', skipTime);
            });
        } catch (e) {
            // Some browsers might not support these yet
        }
    }

    private updateMetadata(item: MediaItem) {
        if (!('mediaSession' in navigator)) return;

        const artwork = item.artwork?.[0]?.url
            ? [{ src: item.artwork[0].url, sizes: '512x512', type: 'image/png' }]
            : [];

        navigator.mediaSession.metadata = new window.MediaMetadata({
            title: decodeHtmlEntities(item.title),
            artist: decodeHtmlEntities(item.artist || ''),
            album: decodeHtmlEntities(item.album || ''),
            artwork: artwork
        });
    }

    destroy() {
        if (!('mediaSession' in navigator)) return;

        const ms = navigator.mediaSession;
        ms.setActionHandler('play', null);
        ms.setActionHandler('pause', null);
        ms.setActionHandler('nexttrack', null);
        ms.setActionHandler('previoustrack', null);
        ms.setActionHandler('seekto', null);
    }

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            mediaSession: 'mediaSession' in navigator
        };
    }
}
