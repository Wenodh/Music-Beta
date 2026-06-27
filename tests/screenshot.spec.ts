import { test, expect } from '@playwright/test';

test('capture screenshots', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Vibe On/);

  // Home page screenshot
  await page.waitForSelector('main');
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/jules/verification/home_page.png' });

  // Search screenshot
  const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');
  await searchInput.fill('Believer');
  await expect(page.getByRole('button', { name: /Songs \(/ })).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/search_results.png' });

  // Player screenshot
  const firstSongCard = page.locator('main img').first();
  await firstSongCard.click({ force: true });
  await expect(page.locator('[data-testid="mini-player"]')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/player_active.png' });
});
