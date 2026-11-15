import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquirePlaybackOwnership } from './playbackCoordinator';

describe('acquirePlaybackOwnership', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('holds an acquired lock until playback stops', async () => {
        let callbackFinished = false;
        const request = vi.fn((_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => {
            const pending = callback({ name: 'vibeon-playback-owner' });
            void pending.then(() => { callbackFinished = true; });
            return pending;
        });
        vi.stubGlobal('navigator', { locks: { request } });
        const onDenied = vi.fn();
        const dispose = acquirePlaybackOwnership(onDenied);
        await Promise.resolve();
        expect(request).toHaveBeenCalledOnce();
        expect(onDenied).not.toHaveBeenCalled();
        expect(callbackFinished).toBe(false);
        dispose();
        await Promise.resolve();
        await Promise.resolve();
        expect(callbackFinished).toBe(true);
    });

    it('waits for the current owner to release so the newly active tab can take over', async () => {
        let held = false;
        let secondAcquired = false;
        const waiters: Array<() => void> = [];
        let requestCount = 0;
        const request = vi.fn(async (_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => {
            if (held) await new Promise<void>((resolve) => waiters.push(resolve));
            held = true;
            requestCount += 1;
            if (requestCount === 2) secondAcquired = true;
            try {
                await callback({ name: 'vibeon-playback-owner' });
            } finally {
                held = false;
                waiters.shift()?.();
            }
        });
        vi.stubGlobal('navigator', { locks: { request } });

        const releaseFirst = acquirePlaybackOwnership(vi.fn());
        await new Promise((resolve) => setTimeout(resolve, 0));
        const releaseSecond = acquirePlaybackOwnership(vi.fn());
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(secondAcquired).toBe(false);

        releaseFirst();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(secondAcquired).toBe(true);
        releaseSecond();
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

    it('falls back without throwing when Web Locks are unavailable', () => {
        vi.stubGlobal('navigator', {});
        expect(() => acquirePlaybackOwnership(vi.fn())).not.toThrow();
    });
});
