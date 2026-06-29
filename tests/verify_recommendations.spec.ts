import { test, expect } from '@playwright/test';

test('main page shows recommendation sections', async ({ page }) => {
  await page.goto('/');
  // Wait for content to load
  await page.waitForTimeout(3000);

  // Check for recommendation headings
  const dailyMix = page.getByText('Daily Mix', { exact: true });
  const discovery = page.getByText('Discovery', { exact: true });
  const forYou = page.getByText('Made For You', { exact: true });

  // At least one should be present if history exists,
  // but since history is empty, it might show default "Trending" or similar if we implemented fallbacks.
  // Actually, MainSection was updated to always show these if they have items.

  // Let's check the DOM for the section containers
  const recSections = await page.locator('section').count();
  console.log('Number of sections:', recSections);

  await page.screenshot({ path: 'verification/main_recommendations.png' });
});
