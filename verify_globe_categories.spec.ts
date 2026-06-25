import { test, expect } from '@playwright/test';

test('verify category switching', async ({ page }) => {
  await page.goto('http://localhost:5173/globe');

  // Wait for initial load
  await page.waitForSelector('canvas');
  await page.waitForTimeout(5000); // Wait for songs to load

  await page.screenshot({ path: 'verification/globe_trending.png' });

  // Click Telugu category
  const teluguBtn = page.locator('button:has-text("Telugu")');
  await teluguBtn.click();

  await page.waitForTimeout(3000); // Wait for fetch
  await page.screenshot({ path: 'verification/globe_telugu.png' });
});
