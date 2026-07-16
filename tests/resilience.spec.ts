import { test, expect } from '@playwright/test';

test.describe('Vibe On Resilience Tests', () => {
    test('Graceful recovery from offline', async ({ page, context }) => {
        test.setTimeout(60000);
        await page.goto('/');
        await expect(page.getByText('Latest Songs')).toBeVisible({ timeout: 20000 });

        // Go offline
        await context.setOffline(true);

        // Attempt search
        const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');
        await searchInput.clear();
        await searchInput.fill('Offline test');

        // Check for offline toast or results behavior
        // (App might show results from cache if any, or just fail gracefully)
        // We'll just wait a bit and ensure no crash happens
        await page.waitForTimeout(2000);

        // Go online
        await context.setOffline(false);
        await searchInput.clear();
        await searchInput.fill('Imagine Dragons');
        await expect(page.getByRole('button', { name: /Songs \(/ })).toBeVisible({ timeout: 20000 });
    });
});
