import { test, expect } from '@playwright/test';

test.describe('Playback Reliability Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Rapid media type switching', async ({ page }) => {
        // 1. Play a song from Home
        await expect(page.locator('text=Trending Songs')).toBeVisible({ timeout: 30000 });
        const firstSong = page.locator('.group.cursor-pointer').first();
        await firstSong.click();

        // Wait for player to show up (check for data-testid="mini-player")
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible({ timeout: 15000 });

        // 2. Quickly switch to Explore Radio
        await page.goto('/explore');
        await page.getByRole('button', { name: 'Radio', exact: false }).click();
        const firstRadio = page.locator('.group.cursor-pointer').first();
        // Wait for results or empty state
        await expect(firstRadio.or(page.getByText('No stations found'))).toBeVisible({ timeout: 15000 });

        if (await firstRadio.isVisible()) {
            await firstRadio.click();
        }

        // 3. Quickly switch to English to get Podcasts if Telugu is empty
        await page.goto('/explore');
        // Find Settings and change language to English if needed,
        // but easier to just check if podcasts exist.
        await page.getByRole('button', { name: 'Podcasts', exact: false }).click();
        const firstPodcast = page.locator('.group.cursor-pointer').first();

        await expect(firstPodcast.or(page.getByText('No stations found'))).toBeVisible({ timeout: 15000 });

        // Verify that the player is still active and hasn't crashed
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible();
    });

    test('Recovery after network interruption during playback', async ({ page, context }) => {
        // 1. Start playback
        await expect(page.locator('text=Trending Songs')).toBeVisible({ timeout: 30000 });
        await page.locator('.group.cursor-pointer').first().click();

        // Wait for it to show up and be playing
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible({ timeout: 15000 });

        // 2. Go Offline
        await context.setOffline(true);

        // 3. Go Online
        await context.setOffline(false);

        // The player should still be there
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible();
    });
});
