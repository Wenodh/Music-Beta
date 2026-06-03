import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
});

test('verify centered expanded player UI', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'verification/mobile_state.png' });
});
