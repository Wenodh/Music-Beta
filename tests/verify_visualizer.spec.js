
import { test, expect } from '@playwright/test';

test('verify visualizer and mode icons', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });

  const port = process.env.PORT || '5173';
  const url = `http://localhost:${port}/`;

  console.log(`Navigating to ${url}`);
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Start playback
  console.log('Starting playback...');
  const songItem = page.locator('div.cursor-pointer').first();
  await songItem.waitFor({ state: 'visible' });
  await songItem.click();
  await page.waitForTimeout(3000);

  // Take screenshot of mini player with visualizer
  console.log('Capturing mini player visualizer...');
  await page.screenshot({ path: 'verification/mini_player_visualizer.png' });

  // Expand the player
  console.log('Expanding player...');
  await page.mouse.click(375 / 2, 812 - 60);
  await page.waitForTimeout(2000);

  // Take screenshot of expanded player background visualizer
  console.log('Capturing expanded player visualizer...');
  await page.screenshot({ path: 'verification/expanded_player_visualizer.png' });

  // Hover to show mode icons
  console.log('Checking visualizer mode icons...');
  await page.hover('div.group.perspective-1000');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'verification/visualizer_mode_icons.png' });

  // Switch modes and capture
  const modes = ['circular', 'waveform', 'particles'];
  for (const mode of modes) {
      console.log(`Switching to ${mode} visualizer...`);
      const btn = page.locator(`button[title="${mode} visualizer"]`).first();
      if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: `verification/visualizer_${mode}.png` });
      }
  }
});
