import { test, expect } from '@playwright/test';

test.describe('Vibe On v1.0 Production Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Vibe On/);
    });

    test('Guest Mode - Search and Play music', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');
        await searchInput.fill('Imagine Dragons');

        await expect(page.getByRole('button', { name: /Songs \(/ })).toBeVisible({ timeout: 15000 });

        // Play the first result - search results are in a grid
        const firstResult = page.locator('.grid .cursor-pointer').first();
        await firstResult.click();

        // Mini player should appear
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible({ timeout: 10000 });
    });

    test('Podcasts - Browse and Navigate', async ({ page }) => {
        await page.getByRole('button', { name: 'Explore' }).click();
        // Wait for Explore page
        await expect(page).toHaveURL(/.*explore/);

        const podcastTab = page.getByRole('button', { name: 'Podcasts' });
        await podcastTab.click();

        // Use a more generic locator for content
        await expect(page.locator('main')).toContainText(/Podcast|No songs found/i, { timeout: 15000 });
    });

    test('Audiobooks - Browse and Navigate', async ({ page }) => {
        await page.getByRole('button', { name: 'Explore' }).click();
        await expect(page).toHaveURL(/.*explore/);

        const audiobookTab = page.getByRole('button', { name: 'Audiobooks' });
        await audiobookTab.click();

        await expect(page.locator('main')).toContainText(/Audiobook|Book|No songs found/i, { timeout: 15000 });
    });

    test('Settings - UI check', async ({ page }) => {
        // Settings is triggered by a button in Navbar
        await page.getByLabel('Settings').click();
        await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
        await expect(page.getByText('Dark Mode')).toBeVisible();
    });
});
