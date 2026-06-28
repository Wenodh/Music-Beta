import { test, expect } from '@playwright/test';

test.describe('Internet Radio Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await expect(page).toHaveTitle(/Vibe On/);
  });

  test('Radio sections on Home page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for Radio sections headings
    const popularRadio = page.getByRole('heading', { name: /Popular Radio Stations/i });
    const trendingRadio = page.getByRole('heading', { name: /Trending Radio Stations/i });

    // At least one should eventually appear
    await expect(popularRadio.or(trendingRadio).first()).toBeVisible({ timeout: 30000 });

    await page.screenshot({ path: 'screenshots/home_radio.png' });
  });

  test('Radio Search', async ({ page }) => {
    // Increase viewport for desktop navbar
    await page.setViewportSize({ width: 1280, height: 800 });

    const searchInput = page.getByTestId('search-input');
    await expect(searchInput).toBeVisible();

    // Search for a generic term likely to yield results in any language
    await searchInput.fill('Jazz');
    await searchInput.press('Enter');

    // Search results should appear in the SearchSection overlay
    const radioTab = page.getByRole('button', { name: /Radio \(/i });
    await expect(radioTab).toBeVisible({ timeout: 30000 });

    await radioTab.click();

    // Verify at least one radio result or the empty state is handled gracefully
    const resultsContainer = page.locator('.grid');
    await expect(resultsContainer).toBeVisible();

    await page.screenshot({ path: 'screenshots/search_radio.png' });
  });

  test('Radio Playback UI Policy', async ({ page }) => {
    // Wait for Home page to load radio sections
    await page.waitForLoadState('networkidle');

    // Use a more specific locator for the radio sections
    const stationCard = page.locator('div:has(> h2:text-is("Popular Radio Stations")) img').first();
    await expect(stationCard).toBeVisible({ timeout: 30000 });

    await stationCard.click({ force: true });

    // Mini player should appear
    const miniPlayer = page.locator('[data-testid="mini-player"]');
    await expect(miniPlayer).toBeVisible({ timeout: 20000 });

    // LIVE indicator should be present in metadata
    const liveIndicator = page.locator('[role="status"]:has-text("LIVE")');
    await expect(liveIndicator).toBeVisible();

    // Progress bar (input range) should be hidden for radio
    const progressBar = page.locator('input#progress');
    await expect(progressBar).toBeHidden();

    await page.screenshot({ path: 'screenshots/player_radio_policy.png' });
  });

  test('Explore Radio Tab Categories', async ({ page }) => {
    // Increase viewport to ensure everything is visible
    await page.setViewportSize({ width: 1280, height: 800 });

    const exploreLink = page.getByRole('button', { name: 'Explore' });
    await exploreLink.click();
    await expect(page).toHaveURL(/.*explore/);

    const radioTab = page.getByRole('button', { name: 'Radio', exact: true });
    await radioTab.click();

    // Generic category buttons
    await expect(page.getByRole('button', { name: 'Countries' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Languages' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Genres' })).toBeVisible();

    await page.screenshot({ path: 'screenshots/explore_radio_tabs.png' });
  });
});
