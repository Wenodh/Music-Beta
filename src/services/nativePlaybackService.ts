import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';

interface Media3Plugin {
    setMediaItem(options: { uri?: string; base64?: string; title: string; artist: string; mediaId: string; artworkUri?: string }): Promise<void>;
    play(): Promise<void>;
    pause(): Promise<void>;
    seekTo(options: { positionMs: number }): Promise<void>;
    setVolume(options: { volume: number }): Promise<void>;
    setPlaybackSpeed(options: { speed: number }): Promise<void>;
    getPlaybackState(): Promise<{ isPlaying: boolean; positionMs: number; durationMs: number; playbackState: number; mediaId: string }>;
    addListener(event: 'playbackEnded', listener: () => void): Promise<PluginListenerHandle>;
    addListener(event: 'playbackChanged', listener: (data: { isPlaying: boolean }) => void): Promise<PluginListenerHandle>;
}

const Media3 = registerPlugin<Media3Plugin>('VibeOnPlayback');

class NativePlaybackService {
    readonly isAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    private async invoke<T>(operation: () => Promise<T>, attempts = 8): Promise<T> {
        let lastError: unknown;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try { return await operation(); }
            catch (error) {
                lastError = error;
                if (!(error instanceof Error) || !error.message.includes('not connected yet')) throw error;
                await new Promise((resolve) => window.setTimeout(resolve, 150));
            }
        }
        throw lastError;
    }

    async setMediaItem(options: { uri: string; title: string; artist: string; mediaId: string; artworkUri?: string }) {
        if (!this.isAvailable) return;
        if (options.uri.startsWith('blob:')) {
            const blob = await fetch(options.uri).then((response) => response.blob());
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            const chunkSize = 0x8000;
            for (let offset = 0; offset < bytes.length; offset += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
            }
            const base64 = btoa(binary);
            await this.invoke(() => Media3.setMediaItem({ ...options, uri: undefined, base64 }));
            return;
        }
        await this.invoke(() => Media3.setMediaItem(options));
    }

    async play() { if (this.isAvailable) await this.invoke(() => Media3.play()); }
    async pause() { if (this.isAvailable) await this.invoke(() => Media3.pause()); }
    async seekTo(seconds: number) {
        if (this.isAvailable) await this.invoke(() => Media3.seekTo({ positionMs: Math.max(0, seconds) * 1000 }));
    }
    async setVolume(volume: number) {
        if (this.isAvailable) await this.invoke(() => Media3.setVolume({ volume: Math.max(0, Math.min(1, volume)) }));
    }
    async setPlaybackSpeed(speed: number) {
        if (this.isAvailable) await this.invoke(() => Media3.setPlaybackSpeed({ speed }));
    }
    async getPlaybackState() {
        if (!this.isAvailable) return null;
        return this.invoke(() => Media3.getPlaybackState());
    }
    async addEndedListener(listener: () => void): Promise<PluginListenerHandle | null> {
        if (!this.isAvailable) return null;
        return Media3.addListener('playbackEnded', listener);
    }
}

export const nativePlaybackService = new NativePlaybackService();
