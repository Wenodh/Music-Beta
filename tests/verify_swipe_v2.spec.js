
import { test, expect } from '@playwright/test';

test('verify expanded player and swipe', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });

  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Click on the first "Trending Song"
  console.log('Clicking on a song...');
  const firstSong = page.locator('text=Aaya Sher').first();
  await firstSong.waitFor({ state: 'visible' });
  await firstSong.click();

  await page.waitForTimeout(3000);

  // Wait for the mini player to appear
  console.log('Waiting for mini player...');
  const miniPlayer = page.locator('div.fixed.bottom-0').first();
  await miniPlayer.waitFor({ state: 'visible' });

  // Click to expand - specific click area to avoid buttons
  console.log('Expanding player...');
  await page.mouse.click(375 / 2, 812 - 50);

  await page.waitForTimeout(2000);

  // Wait for the expanded player
  console.log('Waiting for expanded player...');
  const expandedPlayer = page.locator('div.z-\\[220\\]').first();
  await expandedPlayer.waitFor({ state: 'visible', timeout: 15000 });

  await page.screenshot({ path: 'verification/expanded_player_final.png' });

  // Swipe album art
  console.log('Finding album art for swipe...');
  const albumArt = page.locator('img[layoutId="player-album-art"]').first();
  if (await albumArt.count() === 0) {
      console.log('Album art with layoutId not found, fallback to alt...');
  }

  const target = albumArt.isVisible() ? albumArt : page.locator('img[alt="Album Art"]').first();

  const box = await target.boundingBox();
  if (box) {
    console.log('Swiping album art left...');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 200, box.y + box.height / 2, { steps: 30 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'verification/swiping_left_final.png' });
    await page.mouse.up();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'verification/after_swipe_final.png' });
  }

  // Check visualizer selector
  console.log('Checking visualizer selector...');
  const selectorButton = page.locator('button[title="bars visualizer"]').first();
  if (await selectorButton.count() > 0) {
      await selectorButton.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'verification/visualizer_selector_open_final.png' });
  }
});
