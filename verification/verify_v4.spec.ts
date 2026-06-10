import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

test('verify explore masonry stability v4', async ({ page }) => {
  await page.goto('http://localhost:5173/explore');

  // Wait for initial load
  await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Mobile check (minimum 3 columns)
  const columns = await page.locator('.flex.gap-2.sm\\:gap-3.lg\\:gap-4.items-start > div');
  const count = await columns.count();
  console.log(`Column count on mobile: ${count}`);
  expect(count).toBe(3);

  await page.screenshot({ path: 'verification/explore_mobile_v4.png', fullPage: true });

  // Scroll to bottom to trigger load
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000); // Wait for fetch

  await page.screenshot({ path: 'verification/explore_mobile_v4_scrolled.png', fullPage: true });

  // Verify Player stopPropagation (Manual check usually, but let's check player expansion)
  await page.click('img[src*="i.scdn.co"]', { position: { x: 5, y: 5 } }); // Try to click edge of art
  // Check if player expanded (it should not if stopPropagation works and we didn't click the container)
});
