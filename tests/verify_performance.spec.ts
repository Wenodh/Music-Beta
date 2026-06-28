import { test, expect } from '@playwright/test';

test('verify lazy loading and player state', async ({ page }) => {
  // Set a large viewport for desktop layout
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/');

  // Wait for the page to hydrate
  await page.waitForLoadState('networkidle');

  // Check if we can find a song item in the home page
  let firstSong = page.getByTestId('song-item').first();

  // If not visible on home, try searching
  const isVisible = await firstSong.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isVisible) {
      console.log('No song items visible on home page, trying search...');
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('Top Hits');
      await searchInput.press('Enter');
      firstSong = page.getByTestId('song-item').first();
  }

  await firstSong.waitFor({ state: 'visible', timeout: 30000 });
  await firstSong.click();

  // Verify mini player appears
  const miniPlayer = page.getByTestId('mini-player');
  await expect(miniPlayer).toBeVisible();

  // Verify that it doesn't re-render everything constantly (simulated check)
  // We can't easily measure re-renders from Playwright without injecting scripts,
  // but we can check if the UI stays responsive.

  // Expand player to trigger lazy loading
  await miniPlayer.click();

  // Verify MobileNowPlaying (lazy loaded) appears
  const expandedPlayer = page.getByTestId('expanded-player');
  // It might take a moment due to lazy loading
  await expect(expandedPlayer).toBeVisible({ timeout: 15000 });

  // Check for specialized components within expanded player (Visualizer, Lyrics)
  // These are also lazy loaded.
  const lyricsButton = page.getByRole('button', { name: /lyrics/i }).first();
  if (await lyricsButton.isVisible()) {
      await lyricsButton.click();
      // Wait for lyrics container to appear
      await expect(page.locator('h2').filter({ hasText: 'Lyrics' })).toBeVisible();
  }
});
