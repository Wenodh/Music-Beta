import { test, expect } from '@playwright/test';

test.describe('Search & Input Chaos Test', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Vibe On/);
    });

    test('Extreme input handling', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');

        // 1. Long string
        const longQuery = 'A'.repeat(500);
        await searchInput.fill(longQuery);
        await page.waitForTimeout(1000);

        // 2. SQL Injection / Malicious patterns
        const maliciousQueries = [
            "' OR 1=1 --",
            "<script>alert('xss')</script>",
            "{{constructor.constructor('alert(1)')()}}",
            "../../../../etc/passwd",
            "%20%27%22"
        ];

        for (const query of maliciousQueries) {
            await searchInput.clear();
            await searchInput.fill(query);
            await page.waitForTimeout(500);
        }

        // 3. Unicode & Emoji
        const unicodeQuery = '🎵 🎶 🦄 中文 日本語 🚀';
        await searchInput.clear();
        await searchInput.fill(unicodeQuery);
        await page.waitForTimeout(1000);

        // 4. Rapid typing simulation
        await searchInput.clear();
        for (const char of 'Believer') {
            await searchInput.type(char);
            // No delay between some chars
        }

        // Wait for debounced results
        const firstResult = page.locator('.grid img').first();
        // Even if no results for malicious queries, it should not crash.
        // For 'Believer', we expect results.
        await expect(firstResult).toBeVisible({ timeout: 20000 });
    });

    test('Empty results and error states', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search for songs, albums, artists...');

        // Query that definitely has no results (verified with API)
        await searchInput.fill('THIS_SHOULD_DEFINITELY_NOT_EXIST_IN_ANY_DATABASE_EVER_1234567890');

        // Should show "No results" or similar empty state
        await expect(page.getByText('No results found')).toBeVisible({ timeout: 10000 });

        // Check if the search area exists but has no items
        const resultsCount = await page.locator('.grid img').count();
        expect(resultsCount).toBe(0);

        // Verify we can clear and recover
        await page.getByRole('button', { name: 'Clear Search' }).click();
        await expect(page.getByText('No results found')).not.toBeVisible();
    });
});
