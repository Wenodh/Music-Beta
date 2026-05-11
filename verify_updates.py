import asyncio
import os
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 2000})
        page = await context.new_page()

        print("Navigating to app...")
        try:
            await page.goto("http://localhost:5173", wait_until="networkidle", timeout=60000)
        except Exception as e:
            print(f"Navigation failed or timed out: {e}")

        # Wait for any content to load
        print("Waiting for content to load...")
        await asyncio.sleep(5)

        # 1. Check for Featured Artists specifically
        print("Checking for Featured Artists section...")
        try:
            # The header is an h2
            artist_header = page.locator("h2:has-text('Featured Artists')")
            await artist_header.wait_for(timeout=20000)
            print(f"✅ Found header: {await artist_header.inner_text()}")

            # Check if there are items under it
            artist_items = page.locator("h2:has-text('Featured Artists') + div div.flex.overflow-x-auto div.group")
            count = await artist_items.count()
            print(f"Found {count} artists in the slider.")
        except Exception as e:
            print(f"❌ Featured Artists section not found: {e}")
            # Take a diagnostic screenshot
            await page.screenshot(path="/home/jules/verification/debug_main.png")

        # 2. Check for Recommendations in Playlist page
        print("Checking for Playlist recommendations...")
        try:
            # Find a playlist link
            playlist_link = page.locator("a[href*='/playlists/']").first
            if await playlist_link.count() > 0:
                print(f"Clicking playlist: {await playlist_link.get_attribute('href')}")
                await playlist_link.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(5) # Wait for recommendation fetch

                rec_header = page.locator("h2:has-text('Similar Playlists')")
                await rec_header.wait_for(timeout=20000)
                print(f"✅ Found recommendations on Playlist page: {await rec_header.inner_text()}")

                # Check items
                rec_items = page.locator("h2:has-text('Similar Playlists') + div div.flex.overflow-x-auto div.group")
                print(f"Found {await rec_items.count()} similar playlists.")
                await page.screenshot(path="/home/jules/verification/playlist_rec_check.png")
            else:
                print("❌ No playlist link found on home page to test recommendations.")
        except Exception as e:
            print(f"❌ Failed to verify playlist recommendations: {e}")
            await page.screenshot(path="/home/jules/verification/debug_playlist.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
