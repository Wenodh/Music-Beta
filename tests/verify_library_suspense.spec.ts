import { test, expect } from '@playwright/test';

test('Library page downloads tab works without ReferenceError', async ({ page }) => {
  await page.goto('http://localhost:5173/library');

  // Wait for the library page to load
  await expect(page.getByText('My Library')).toBeVisible();

  // Click on the Downloads tab
  const downloadsTab = page.getByRole('button', { name: 'Downloads' });
  await expect(downloadsTab).toBeVisible();
  await downloadsTab.click();

  // Check if "Manage Downloads" is visible (inside Suspense)
  await expect(page.getByText('Manage Downloads')).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: 'verification/library_downloads.png' });
});
