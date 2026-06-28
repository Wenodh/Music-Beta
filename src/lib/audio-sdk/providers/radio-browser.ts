import { AudioProvider, SearchOptions, ProviderCapabilities, ProviderInfo } from '../registry';
import { MediaItem, PlayableSource } from '../models';
import { eventBus, Events } from '../../events';
import { globalCache } from '../../cache';

export class RadioBrowserProvider implements AudioProvider {
    readonly id = 'radio-browser';
    readonly name = 'Radio Browser';
    readonly supportedTypes = ['radio'];

    readonly capabilities: ProviderCapabilities = {
        search: true,
        recommendations: false,
        favorites: true,
        history: true,
        downloads: false,
        continueListening: false,
        streaming: true,
        live: true,
        lyrics: false,
        speedControl: false,
        authentication: false,
    };

    readonly info: ProviderInfo = {
        id: 'radio-browser',
        displayName: 'Radio Browser',
        website: 'https://www.radio-browser.info/',
        supportsOffline: false,
        supportsStreaming: true,
    };

    private baseUrl: string;
    private metadataInterval: number | null = null;
    private currentStationId: string | null = null;

    constructor(baseUrl: string = 'https://de1.api.radio-browser.info/json') {
        this.baseUrl = baseUrl;
        this.init();
    }

    private init() {
        eventBus.on(Events.PLAYBACK_STOPPED, () => this.stopMetadataPolling());
        eventBus.on(Events.PLAYBACK_STARTED, this.handlePlaybackStarted);
    }

    private async fetchApi(endpoint: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<any> {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => queryParams.append(key, String(value)));

        const url = `${this.baseUrl}/${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await fetch(url, { signal });
        if (!response.ok) {
            throw new Error(`Radio Browser API error: ${response.statusText}`);
        }
        return response.json();
    }

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        const results = await this.fetchApi('stations/byname/' + encodeURIComponent(query), {
            limit: options?.limit || 20,
            offset: (options?.page || 0) * (options?.limit || 20),
            hidebroken: 'true',
            order: 'clickcount',
            reverse: 'true'
        }, options?.signal);
        return results.map((s: any) => this.mapToMediaItem(s));
    }

    async getMedia(id: string, type: string): Promise<MediaItem> {
        if (type !== 'radio') throw new Error(`Type ${type} not supported`);
        const results = await this.fetchApi('stations/byuuid/' + id);
        if (!results || results.length === 0) throw new Error('Station not found');
        return this.mapToMediaItem(results[0]);
    }

    async getRecommendations(_id: string): Promise<MediaItem[]> {
        // Fallback to popular for now as Radio Browser doesn't have a direct "similar" API per station
        return this.getPopular();
    }

    async getPlayableSource(id: string, _quality?: string): Promise<PlayableSource> {
        const station = await this.getMedia(id, 'radio');
        const url = station.stream?.url;
        if (!url) throw new Error('No stream URL found');

        // Automatic stream detection logic
        let format: 'mp3' | 'aac' | 'hls' = 'mp3';
        if (url.includes('.m3u8') || url.includes('.m3u') || url.includes('/hls/')) {
            format = 'hls';
        } else if (url.includes('.aac') || url.includes('type=aac')) {
            format = 'aac';
        }

        this.startMetadataPolling(id);

        return {
            url,
            format,
            mimeType: format === 'hls' ? 'application/vnd.apple.mpegurl' : (format === 'aac' ? 'audio/aac' : 'audio/mpeg')
        };
    }

    async getPopular(limit: number = 20, options?: { signal?: AbortSignal }): Promise<MediaItem[]> {
        const results = await this.fetchApi('stations/topclick', { limit, hidebroken: 'true' }, options?.signal);
        return results.map((s: any) => this.mapToMediaItem(s));
    }

    async getTrending(limit: number = 20, options?: { signal?: AbortSignal }): Promise<MediaItem[]> {
        // Using clicktrend as a proxy for "trending"
        const results = await this.fetchApi('stations/lastclick', { limit, hidebroken: 'true' }, options?.signal);
        return results.map((s: any) => this.mapToMediaItem(s));
    }

    async getCountries(): Promise<any[]> {
        return globalCache.wrap('radio_countries', () => this.fetchApi('countries'), 1000 * 60 * 60 * 24); // 24h
    }

    async getLanguages(): Promise<any[]> {
        return globalCache.wrap('radio_languages', () => this.fetchApi('languages'), 1000 * 60 * 60 * 24); // 24h
    }

    async getTags(): Promise<any[]> {
        return globalCache.wrap('radio_tags', () =>
            this.fetchApi('tags', { hidebroken: 'true', order: 'stationcount', reverse: 'true', limit: 100 }),
            1000 * 60 * 60 * 24 // 24h
        );
    }

    private mapToMediaItem(s: any): MediaItem {
        return {
            id: s.stationuuid,
            provider: this.id,
            type: 'radio',
            title: s.name,
            subtitle: s.country ? `${s.country}${s.state ? ', ' + s.state : ''}` : s.language,
            description: s.tags,
            artwork: s.favicon ? [{ url: s.favicon }] : [],
            playable: true,
            language: s.language,
            genres: s.tags ? s.tags.split(',').map((t: string) => t.trim()) : [],
            stream: {
                url: s.url_resolved || s.url,
                format: 'mp3' // Default, will be refined in getPlayableSource
            },
            metadata: {
                ...s,
                votes: s.votes,
                clickcount: s.clickcount,
                codec: s.codec,
                bitrate: s.bitrate
            }
        };
    }

    private startMetadataPolling(stationId: string) {
        this.stopMetadataPolling();
        this.currentStationId = stationId;

        // Initial fetch
        this.pollMetadata();

        this.metadataInterval = window.setInterval(() => {
            this.pollMetadata();
        }, 20000); // Every 20 seconds
    }

    private stopMetadataPolling() {
        if (this.metadataInterval) {
            window.clearInterval(this.metadataInterval);
            this.metadataInterval = null;
        }
    }

    private async pollMetadata() {
        if (!this.currentStationId) return;

        try {
            const results = await this.fetchApi('stations/byuuid/' + this.currentStationId);
            if (results && results.length > 0) {
                const station = results[0];
                eventBus.emit(Events.PLAYBACK_METADATA_UPDATE, {
                    id: this.currentStationId,
                    provider: this.id,
                    metadata: {
                        currentSong: station.lasttrack || null,
                        listeners: station.clickcount
                    }
                });
            }
        } catch (error) {
            console.error('Radio metadata poll failed', error);
        }
    }

    // Method to allow external cleanup if needed, though EventBus handles it
    public destroy() {
        this.stopMetadataPolling();
        eventBus.off(Events.PLAYBACK_STOPPED, this.stopMetadataPolling);
        eventBus.off(Events.PLAYBACK_STARTED, this.handlePlaybackStarted);
    }

    private handlePlaybackStarted = (data: any) => {
        if (data.provider !== this.id) {
            this.stopMetadataPolling();
        }
    };
}
