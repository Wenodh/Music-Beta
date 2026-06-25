import { test, expect } from '@playwright/test';

test('Song Globe page loads and renders 3D canvas', async ({ page }) => {
  await page.goto('http://localhost:5173/globe');

  // Wait for the canvas to be visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // Wait for some time to allow Three.js to initialize
  await page.waitForTimeout(5000);

  // Take a screenshot for visual verification
  await page.screenshot({ path: 'verification/globe_optimized.png' });
});
