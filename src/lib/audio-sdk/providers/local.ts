import { AudioProvider, ProviderCapabilities, ProviderInfo, SearchOptions } from '../registry';
import { MediaItem, PlayableSource } from '../models';
import { StorageService } from '../../storage/StorageService';

export class LocalMediaProvider implements AudioProvider {
    readonly id = 'local';
    readonly name = 'Local Media';
    readonly supportedTypes = ['song'];
    readonly capabilities: ProviderCapabilities = {
        search: true,
        recommendations: false,
        favorites: true,
        history: true,
        downloads: false,
        continueListening: true,
        streaming: false,
        live: false,
        lyrics: false,
        speedControl: true,
        authentication: false
    };

    readonly info: ProviderInfo = {
        id: 'local',
        displayName: 'Local Media',
        supportsOffline: true,
        supportsStreaming: false
    };

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        // Search IndexedDB for local files
        const allLocal = await StorageService.getAllDownloads();
        return (allLocal || [])
            .filter(item => item.title.toLowerCase().includes(query.toLowerCase()) ||
                           item.subtitle?.toLowerCase().includes(query.toLowerCase()))
            .map(item => ({
                ...item,
                provider: this.id,
                playable: true
            }));
    }

    async getMedia(id: string, type: string): Promise<MediaItem> {
        const item = await StorageService.getDownload(id);
        if (!item) throw new Error('Local media not found');
        return {
            ...item,
            provider: this.id,
            playable: true
        };
    }

    async getRecommendations(id: string): Promise<MediaItem[]> {
        return [];
    }

    async getPlayableSource(id: string, quality?: string): Promise<PlayableSource> {
        const blob = await StorageService.getDownloadBlob(id);
        if (!blob) throw new Error('Local file blob not found');

        return {
            url: URL.createObjectURL(blob),
            format: 'mp3',
            mimeType: blob.type
        };
    }

    // Desktop File System Access indexing
    public async indexFolder() {
        if (!('showDirectoryPicker' in window)) {
            throw new Error('File System Access API not supported');
        }

        const handle = await (window as any).showDirectoryPicker();
        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.match(/\.(mp3|m4a|wav|flac)$/i)) {
                const file = await entry.getFile();
                await this.indexFile(file);
            }
        }
    }

    private async indexFile(file: File) {
        // Extract metadata and store in IndexedDB via StorageService
        const id = crypto.randomUUID();
        const mediaItem: MediaItem = {
            id,
            provider: this.id,
            type: 'song',
            title: file.name,
            artwork: [],
            playable: true,
            metadata: {
                fileName: file.name,
                size: file.size,
                type: file.type
            }
        };

        await StorageService.saveDownload(mediaItem, file);
    }
}
