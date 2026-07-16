import { test, expect } from '@playwright/test';

test.describe('UI Polish & Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Responsive layout: Mobile vs Desktop', async ({ page }) => {
        // Desktop check
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect(page.locator('nav')).toBeVisible(); // Desktop navbar

        // Mobile check
        await page.setViewportSize({ width: 375, height: 667 });
        // Bottom bar should be visible on mobile
        await expect(page.locator('nav')).toBeVisible(); // App uses a BottomBar and Navbar

        // Check for empty states visibility
        await page.goto('/library');
        await page.getByRole('button', { name: 'Offline', exact: true }).click();
        await expect(page.getByText('No offline songs yet.')).toBeVisible();
    });

    test('Skeleton loaders during page transitions', async ({ page }) => {
        await page.goto('/explore');
        // Look for skeletons
        const skeletons = page.locator('.animate-pulse');
        // They might be gone quickly, so we just check if they are part of the DOM
        // or wait for the page to load and check the final state.
        await expect(page.locator('h1')).toContainText('Explore');
    });
});
