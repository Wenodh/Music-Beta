import { test, expect } from '@playwright/test';

test.describe('Adversarial Playback Stress Test', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Vibe On/);
        await expect(page.getByText('Latest Songs')).toBeVisible({ timeout: 30000 });
    });

    test('Rapid toggle play/pause/next', async ({ page }) => {
        const firstSongCard = page.locator('main img').first();
        await firstSongCard.click({ force: true });

        const miniPlayer = page.locator('[data-testid="mini-player"]');
        await expect(miniPlayer).toBeVisible({ timeout: 20000 });

        const playPauseBtn = miniPlayer.locator('button').filter({ has: page.locator('.fa-play, .fa-pause') }).first();
        const nextBtn = miniPlayer.locator('svg.io-md-skip-forward').first().locator('xpath=..');

        for (let i = 0; i < 20; i++) {
            if (await playPauseBtn.isVisible()) {
                await playPauseBtn.click({ force: true });
            }
            if (i % 5 === 0 && await nextBtn.isVisible()) {
                await nextBtn.click({ force: true });
            }
            await page.waitForTimeout(50);
        }

        await expect(miniPlayer).toBeVisible();
    });

    test('Engine switching stress', async ({ page }) => {
        // 1. Play Music (Native Engine)
        const firstSongCard = page.locator('main img').first();
        await firstSongCard.click({ force: true });
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible({ timeout: 20000 });

        // 2. Play Radio (HLSEngine)
        await page.getByRole('button', { name: 'Explore' }).click();

        // Find Radio heading in Explore
        const radioHeading = page.locator('h2').filter({ hasText: /^Radio$/ }).first();
        if (await radioHeading.isVisible()) {
            await radioHeading.click();
        } else {
             // If not a heading, maybe just any text that is exactly "Radio"
             await page.getByText('Radio', { exact: true }).first().click();
        }

        const radioStation = page.locator('main img').first();
        await expect(radioStation).toBeVisible({ timeout: 20000 });
        await radioStation.click({ force: true });

        await page.waitForTimeout(2000);

        // 3. Play Podcast
        const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');
        await searchInput.fill('Podcast');
        await page.keyboard.press('Enter');

        const firstResult = page.locator('.grid img').first();
        await expect(firstResult).toBeVisible({ timeout: 20000 });
        await firstResult.click({ force: true });

        // 4. Back Home
        await page.locator('div').filter({ hasText: /^Vibe On$/ }).first().click();
        await expect(page.locator('[data-testid="mini-player"]')).toBeVisible();
    });
});
