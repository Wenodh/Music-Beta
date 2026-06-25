import { test, expect } from '@playwright/test';

test('verify desktop spacing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/home/jules/verification/desktop_spacing.png' });
});

test('verify mobile spacing', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/home/jules/verification/mobile_home_dynamic.png' });

  await page.goto('http://localhost:5173/search');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/home/jules/verification/mobile_search_dynamic.png' });
});
