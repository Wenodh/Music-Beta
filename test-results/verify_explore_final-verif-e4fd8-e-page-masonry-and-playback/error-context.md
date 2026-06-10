# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify_explore_final.spec.ts >> verify explore page masonry and playback
- Location: verify_explore_final.spec.ts:3:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('.columns-2 > div, .columns-3 > div, .columns-4 > div').first()
    96 × locator resolved to <div class="relative mb-4 break-inside-avoid group cursor-pointer">…</div>
     - attempting click action
       - waiting for element to be visible, enabled and stable
     - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6] [cursor=pointer]:
      - generic [ref=e7]: VibeOn
      - generic [ref=e8]: by WENODH
    - generic [ref=e10]:
      - textbox "Search for songs, albums, artists..." [ref=e11]
      - img [ref=e12]
    - generic [ref=e15]:
      - button "Explore" [active] [ref=e16] [cursor=pointer]:
        - img [ref=e18]
        - generic [ref=e21]: Explore
      - button "Settings" [ref=e22] [cursor=pointer]:
        - img "Logo" [ref=e23]
        - generic [ref=e24]: Account
  - main [ref=e25]:
    - generic [ref=e28]:
      - generic [ref=e29]:
        - img [ref=e31]
        - heading "Explore" [level=1] [ref=e34]
      - paragraph [ref=e35]: Discover new music in telugu curated just for you.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('verify explore page masonry and playback', async ({ page }) => {
  4  |   test.setTimeout(120000);
  5  |
  6  |   await page.goto('http://localhost:5173');
  7  |   await page.waitForSelector('nav');
  8  |
  9  |   const exploreButton = page.locator('button[aria-label="Explore"]').last();
  10 |   await exploreButton.click();
  11 |
  12 |   await expect(page).toHaveURL(/\/explore/);
  13 |
  14 |   // Wait for the spinner to disappear and content to appear
  15 |   // We'll wait for the "columns" container to have children
  16 |   const cardSelector = '.columns-2 > div, .columns-3 > div, .columns-4 > div';
  17 |
  18 |   console.log('Waiting for cards to load...');
  19 |   try {
  20 |     await page.waitForSelector(cardSelector, { state: 'visible', timeout: 60000 });
  21 |   } catch (e) {
  22 |     console.log('Cards did not appear within 60s, taking screenshot of current state.');
  23 |   }
  24 |
  25 |   await page.screenshot({ path: 'explore_final_verification.png', fullPage: true });
  26 |
  27 |   const cardCount = await page.locator(cardSelector).count();
  28 |   console.log(`Found ${cardCount} cards.`);
  29 |
  30 |   if (cardCount > 0) {
  31 |     const firstSong = page.locator(cardSelector).first();
> 32 |     await firstSong.click();
     |                     ^ Error: locator.click: Test timeout of 120000ms exceeded.
  33 |     await page.waitForTimeout(5000);
  34 |     await page.screenshot({ path: 'explore_playback_verification.png' });
  35 |   }
  36 | });
  37 |
```