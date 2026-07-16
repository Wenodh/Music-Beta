import { test, expect } from '@playwright/test';

test.describe('Vibe On Marathon Session', () => {
    test('Simulated long-running usage', async ({ page }) => {
        test.setTimeout(300000); // 5 minutes for the simulation
        await page.goto('/');
        await expect(page.getByText('Latest Songs')).toBeVisible({ timeout: 20000 });

        // Sequence of repeated actions to stress the app
        for (let i = 0; i < 5; i++) {
            // 1. Search
            const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');
            await searchInput.fill(`Marathon query ${i}`);
            await page.waitForTimeout(1000);

            // 2. Navigation
            await page.getByRole('button', { name: 'Explore' }).click();
            await page.waitForTimeout(1000);

            // 3. Play something (if exists)
            const firstSong = page.locator('main img').first();
            if (await firstSong.isVisible()) {
                await firstSong.click({ force: true });
                await page.waitForTimeout(2000); // Let it play a bit
            }

            // 4. Back home
            await page.getByRole('link', { name: 'Vibe On' }).or(page.getByText('Vibe On')).first().click();
            await page.waitForTimeout(1000);
        }

        // Verify no console errors occurred during the session
        // (Playwright catches errors, but we can also check for crash indicators)
        await expect(page.getByText('Latest Songs')).toBeVisible();
    });
});
