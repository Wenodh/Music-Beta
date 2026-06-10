import { test, expect } from '@playwright/test';

test('verify explore page UI and masonry layout', async ({ page }) => {
  await page.goto('http://localhost:5173/explore');

  // Wait for content to load
  await page.waitForSelector('h1:has-text("Explore")');

  // Check for various aspect ratios in cards
  const cards = page.locator('.break-inside-avoid');
  await expect(cards.first()).toBeVisible();

  // Capture screenshot on mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'verification/explore_mobile_v2.png' });

  // Capture screenshot on desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: 'verification/explore_desktop_v2.png' });
});
