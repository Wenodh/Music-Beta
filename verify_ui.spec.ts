import { test, expect } from '@playwright/test';

test('verify home page and auth modal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('http://localhost:5176');

  await page.waitForSelector('text=Trending Songs', { timeout: 15000 });
  await page.screenshot({ path: '/home/jules/verification/home_large.png', fullPage: true });

  const loginButton = page.getByRole('button', { name: /Login|Account/ });
  await loginButton.click();

  await page.waitForSelector('text=Sign in', { timeout: 5000 });
  await page.screenshot({ path: '/home/jules/verification/auth_modal.png' });
});
