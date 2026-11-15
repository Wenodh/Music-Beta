import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquirePlaybackOwnership } from './playbackCoordinator';

describe('acquirePlaybackOwnership', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('holds an acquired lock until playback stops', async () => {
        const request = vi.fn((_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => callback({ name: 'vibeon-playback-owner' }));
        vi.stubGlobal('navigator', { locks: { request } });
        const onDenied = vi.fn();
        const dispose = acquirePlaybackOwnership(onDenied);
        await Promise.resolve();
        expect(request).toHaveBeenCalledOnce();
        expect(onDenied).not.toHaveBeenCalled();
        dispose();
        await Promise.resolve();
    });

    it('notifies the tab when another tab owns playback', async () => {
        const request = vi.fn((_name: string, _options: unknown, callback: (lock: null) => Promise<void>) => callback(null));
        vi.stubGlobal('navigator', { locks: { request } });
        const onDenied = vi.fn();
        acquirePlaybackOwnership(onDenied);
        await Promise.resolve();
        expect(onDenied).toHaveBeenCalledOnce();
    });

    it('does not hold a lock when playback stops before acquisition completes', async () => {
        let runCallback: (() => Promise<void>) | undefined;
        const request = vi.fn((_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => {
            runCallback = () => callback({ name: 'vibeon-playback-owner' });
            return Promise.resolve();
        });
        vi.stubGlobal('navigator', { locks: { request } });
        const dispose = acquirePlaybackOwnership(vi.fn());
        dispose();
        await runCallback?.();
        expect(request).toHaveBeenCalledOnce();
    });
});
