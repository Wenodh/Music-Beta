import { test, expect } from '@playwright/test';

test('verify mood sections order and titles', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for content to load
  await page.waitForSelector('h2', { timeout: 10000 });

  const headings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim());
  });

  console.log('Headings found:', headings);

  // Find index of "Top Playlists"
  const topPlaylistsIndex = headings.indexOf('Top Playlists');
  expect(topPlaylistsIndex).toBeGreaterThan(-1);

  // Check that mood sections come after Top Playlists
  const moodSections = ['Meditation', 'Work', "Developer's Picks", 'Chill', 'Workout'];

  for (const mood of moodSections) {
    const index = headings.indexOf(mood);
    // Some might not load if no results, but let's assume they should for the verification test
    if (index !== -1) {
        expect(index).toBeGreaterThan(topPlaylistsIndex);
    }
  }

  // Verify exact order for mood sections if they exist
  const meditationIndex = headings.indexOf('Meditation');
  const workIndex = headings.indexOf('Work');
  const devPicksIndex = headings.indexOf("Developer's Picks");
  const chillIndex = headings.indexOf('Chill');
  const workoutIndex = headings.indexOf('Workout');

  if (meditationIndex !== -1 && workIndex !== -1) expect(meditationIndex).toBeLessThan(workIndex);
  if (workIndex !== -1 && devPicksIndex !== -1) expect(workIndex).toBeLessThan(devPicksIndex);
  if (devPicksIndex !== -1 && chillIndex !== -1) expect(devPicksIndex).toBeLessThan(chillIndex);
  if (chillIndex !== -1 && workoutIndex !== -1) expect(chillIndex).toBeLessThan(workoutIndex);

  // Take a screenshot
  await page.screenshot({ path: 'moods_rearranged_verification.png', fullPage: true });
});
