import { test, expect } from '@playwright/test';

test('PageTemplate recommendations verification', async ({ page }) => {
  // Go to a known playlist page
  // We'll search for a playlist first
  await page.goto('http://localhost:5173');

  // Wait for some content to load
  await page.waitForSelector('text=Top Playlists', { timeout: 10000 });

  // Click on the first playlist in the slider
  await page.click('text=Top Playlists >> xpath=.. >> xpath=.. >> .group >> img');

  // Wait for the page to load
  await page.waitForSelector('text=Songs', { timeout: 10000 });

  // Check if recommendations are visible
  // For playlists, it should be "Similar Playlists"
  // We'll scroll down to make sure they are triggered/visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const similarHeader = page.locator('text=Similar Playlists');
  // It might take a second to fetch
  await expect(similarHeader).toBeVisible({ timeout: 10000 });

  // Also check for an album page
  await page.goto('http://localhost:5173');
  await page.waitForSelector('text=Trending Albums', { timeout: 10000 });
  await page.click('text=Trending Albums >> xpath=.. >> xpath=.. >> .group >> img');
  await page.waitForSelector('text=Songs', { timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const moreByHeader = page.locator('text=More by');
  await expect(moreByHeader).toBeVisible({ timeout: 10000 });

  console.log('Recommendations verified successfully!');
});
