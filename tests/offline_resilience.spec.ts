import { test, expect } from '@playwright/test';

test.describe('Offline & Recovery Simulation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Transition to Offline and Home Page Recovery', async ({ page, context }) => {
        // 1. Initially online - wait for content to load
        await expect(page.locator('text=Trending Songs')).toBeVisible({ timeout: 30000 });

        // 2. Go Offline
        await context.setOffline(true);

        // The app should detect offline and show the offline state on Home
        await expect(page.getByText("You're Offline", { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: 'Go to Downloads' })).toBeVisible();

        // 3. Go Online
        await context.setOffline(false);

        // Should recover and show content again
        await expect(page.locator('text=Trending Songs')).toBeVisible({ timeout: 30000 });
    });

    test('Radio playback failure in offline mode', async ({ page, context }) => {
        await page.goto('/explore');
        // Click Radio tab
        await page.getByRole('button', { name: 'Radio', exact: false }).click();

        // Wait for radio stations to load while online
        const firstStation = page.locator('.group.cursor-pointer').first();
        await expect(firstStation).toBeVisible({ timeout: 30000 });

        // Now go offline
        await context.setOffline(true);

        // Click it - use force because of the hover overlays
        await firstStation.click({ force: true });

        // 4. Expect toast or error message
        // ExploreSongCard.tsx shows: "Internet connection required for Live Radio"
        await expect(page.getByText('Internet connection required for Live Radio')).toBeVisible({ timeout: 10000 });
    });

    test('Accessing Library while offline', async ({ page, context }) => {
        // Navigate to library first so chunks are loaded
        await page.goto('/library');
        await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible({ timeout: 30000 });

        // Now go offline
        await context.setOffline(true);

        // Switch to Offline tab
        await page.getByRole('button', { name: 'Offline', exact: true }).click();

        // Verify Library is still there
        await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible();

        // Verify empty state message if no downloads
        await expect(page.getByText('No offline songs yet.')).toBeVisible();
    });
});
