import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true,
  permissions: ['geolocation'],
});

test('verify explore density v3', async ({ page }) => {
  // Desktop view
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/explore');

  // Wait for content
  await page.waitForSelector('h1:has-text("Explore")');
  // Wait for songs to load (wait for more than just the logos)
  await page.waitForFunction(() => document.querySelectorAll('img').length > 5, { timeout: 20000 });

  // Small delay for images to settle
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verification/explore_desktop_v3.png' });

  // Large Desktop view
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'verification/explore_ultra_v3.png' });

  // Mobile view
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'verification/explore_mobile_v3.png' });
});
