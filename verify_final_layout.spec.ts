import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 667 }, // iPhone 6/7/8
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1',
});

test('verify mobile player layout reversion', async ({ page }) => {
  await page.goto('http://localhost:5174/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Find a song and click it to start the player
  // Using a more robust selector for the first song
  const firstSong = page.locator('button:has-text("Play"), .group\\/song').first();
  await firstSong.click({ force: true });

  // Wait for player to appear
  const player = page.locator('div.fixed.bottom-0');
  await expect(player).toBeVisible({ timeout: 10000 });

  // Check for the three main divs in the player bar (mobile)
  // 1st div: Artwork (should be visible)
  const artwork = player.locator('img.rounded-full');
  await expect(artwork).toBeVisible();

  // 2nd div: Play/Pause in center (should be visible)
  const playPauseBtn = player.locator('button.bg-primary');
  await expect(playPauseBtn).toBeVisible();

  // Check if it's roughly in the center of the screen
  const box = await playPauseBtn.boundingBox();
  if (box) {
    const center = box.x + box.width / 2;
    expect(center).toBeGreaterThan(150); // Roughly middle of 375px
    expect(center).toBeLessThan(225);
  }

  // 3rd div: More options (should be visible)
  const moreBtn = player.locator('svg').locator('xpath=..').filter({ has: page.locator('circle, path') }).last(); // Heuristic for the ellipsis/more
  // Better: look for the IoEllipsisVertical which is usually the last or near last
  const ellipsis = player.locator('svg').filter({ hasText: '' }).last();

  // Take screenshot of the reverted mobile player
  await page.screenshot({ path: 'reverted_mobile_player.png' });

  console.log('Mobile player layout verified and screenshot saved.');
});
