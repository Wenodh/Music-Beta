
import { test, expect } from '@playwright/test';

test('verify expanded player and swipe', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });

  const port = process.env.PORT || '5173';
  const url = `http://localhost:${port}/`;

  console.log(`Navigating to ${url}`);
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Click on any song item to start playback
  console.log('Clicking on a song...');
  const songItem = page.locator('div.cursor-pointer').first();
  await songItem.waitFor({ state: 'visible' });
  await songItem.click();

  await page.waitForTimeout(3000);

  // Mini player should appear
  console.log('Checking for mini player...');
  const miniPlayer = page.locator('div.fixed.bottom-0').first();
  await miniPlayer.waitFor({ state: 'visible' });

  // Expand the player
  console.log('Expanding player...');
  // Click the center of the mini player area
  await page.mouse.click(375 / 2, 812 - 60);

  await page.waitForTimeout(2000);

  // Wait for the expanded player
  console.log('Waiting for expanded player (z-[220])...');
  const expandedPlayer = page.locator('div.z-\\[220\\]').first();
  try {
      await expandedPlayer.waitFor({ state: 'visible', timeout: 10000 });
      console.log('Expanded player visible');
  } catch (e) {
      console.log('Expanded player not visible, taking debug screenshot');
      await page.screenshot({ path: 'verification/debug_not_expanded.png' });
      throw e;
  }

  await page.screenshot({ path: 'verification/expanded_player_final_v3.png' });

  // Swipe album art
  console.log('Finding album art for swipe...');
  const albumArt = page.locator('img[layoutId="player-album-art"]').first();
  const box = await albumArt.boundingBox();

  if (box) {
    console.log('Swiping album art left...');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 150, box.y + box.height / 2, { steps: 20 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'verification/swiping_left_v3.png' });
    await page.mouse.up();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'verification/after_swipe_v3.png' });
  }

  // Check visualizer selector
  console.log('Checking visualizer selector...');
  const selectorButton = page.locator('button[title="bars visualizer"]').first();
  if (await selectorButton.count() > 0) {
      await page.hover('div.group.perspective-1000'); // Hover to show selector
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'verification/visualizer_selector_hover_v3.png' });
  }
});
