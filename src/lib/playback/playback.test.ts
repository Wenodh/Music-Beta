import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackManager } from './PlaybackManager';
import { MediaItem } from '../audio-sdk/models';

// Mock engines since they use HTMLAudioElement
vi.mock('./engines/NativeAudioEngine', () => {
    return {
        NativeAudioEngine: class {
            id = 'native';
            load = vi.fn().mockResolvedValue(undefined);
            play = vi.fn().mockResolvedValue(undefined);
            pause = vi.fn();
            stop = vi.fn();
            seek = vi.fn();
            setVolume = vi.fn();
            state = 'idle';
            audioElement = { addEventListener: vi.fn() };
            constructor() {}
        }
    };
});

describe('PlaybackManager', () => {
    let manager: PlaybackManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = PlaybackManager.getInstance();
    });

    it('should be a singleton', () => {
        const instance1 = PlaybackManager.getInstance();
        const instance2 = PlaybackManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should load and play a track', async () => {
        const mockItem: MediaItem = {
            id: '1',
            title: 'Test Track',
            provider: 'test',
            type: 'song',
            playable: true,
            stream: { url: 'http://test.mp3', format: 'mp3' }
        } as any;

        await manager.play(mockItem);
        expect(manager.currentMediaItem).toBe(mockItem);
    });
});
