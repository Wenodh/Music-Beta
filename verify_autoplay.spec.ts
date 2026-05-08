import { test, expect } from '@playwright/test';

test('verify autoplay toggle in settings drawer', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for the app to load
  await page.waitForSelector('text=Trending Songs', { timeout: 10000 });

  // Open Settings Drawer
  // The SettingsDrawer is usually opened by clicking a settings icon in the Navbar.
  // Looking at Navbar.tsx, it might be an icon near the login button.
  // Or I can trigger it via Redux if I could, but let's try to find the button.

  // Actually, I can just click the settings button. It's an icon button.
  // Let's look for an element with an aria-label or just the icon.
  // In many cases, it's the gear icon.

  // Let's try to find it by clicking on the settings icon.
  const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).last(); // Heuristic
  await settingsButton.click();

  // Wait for drawer to open
  await page.waitForSelector('text=Settings', { timeout: 5000 });

  // Check for Autoplay toggle
  await expect(page.locator('text=Autoplay (Song Radio)')).toBeVisible();

  // Take a screenshot of the settings drawer
  await page.screenshot({ path: '/home/jules/verification/settings_drawer.png' });
});
