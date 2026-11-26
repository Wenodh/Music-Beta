import { expect, test } from '@playwright/test';

test('exclusive playback ownership hands off cleanly between browser tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const firstTab = await context.newPage();
    const secondTab = await context.newPage();

    try {
        await Promise.all([firstTab.goto('/'), secondTab.goto('/')]);

        await firstTab.evaluate(async () => {
            const { acquirePlaybackOwnership } = await import('/src/services/playbackCoordinator.ts');
            let acquired = false;
            let denied = false;
            const release = acquirePlaybackOwnership(
                () => { denied = true; },
                () => { acquired = true; }
            );
            (window as any).__playbackLock = { release, state: () => ({ acquired, denied }) };
        });

        await expect.poll(() => firstTab.evaluate(() => (window as any).__playbackLock.state().acquired)).toBe(true);

        await secondTab.evaluate(async () => {
            const { acquirePlaybackOwnership } = await import('/src/services/playbackCoordinator.ts');
            let acquired = false;
            let denied = false;
            const release = acquirePlaybackOwnership(
                () => { denied = true; },
                () => { acquired = true; }
            );
            (window as any).__playbackLock = { release, state: () => ({ acquired, denied }) };
        });

        await expect.poll(() => secondTab.evaluate(() => (window as any).__playbackLock.state())).toEqual({
            acquired: false,
            denied: false,
        });

        await firstTab.evaluate(() => (window as any).__playbackLock.release());
        await expect.poll(() => secondTab.evaluate(() => (window as any).__playbackLock.state().acquired)).toBe(true);
        await secondTab.evaluate(() => (window as any).__playbackLock.release());
    } finally {
        await context.close();
    }
});
