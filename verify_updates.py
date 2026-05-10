import asyncio
import os
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Use a larger viewport to see more content
        context = await browser.new_context(viewport={'width': 1280, 'height': 2000})
        page = await context.new_page()

        print("Navigating to app...")
        try:
            await page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            # Try to continue anyway

        # 1. Play a song to generate history for Daily Mix
        print("Attempting to play a song for history...")
        try:
            # Wait for any song card or list item
            song_item = page.locator("div.flex.items-center.justify-between.p-3.rounded-xl").first
            await song_item.wait_for(timeout=15000)
            await song_item.click()
            print("Clicked a song.")

            # Wait for player to appear
            await page.wait_for_selector(".fixed.bottom-0", timeout=10000)
            print("Player appeared.")

            # Wait a bit for 'recentlyPlayed' to be updated in Redux
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Error playing song: {e}")

        # 2. Refresh to see Daily Mix
        print("Refreshing to check for Daily Mix...")
        await page.reload(wait_until="networkidle")

        # 3. Check for headers
        headers = [
            "Trending Songs",
            "Trending Albums",
            "Top Playlists",
            "Featured Artists"
        ]

        for header in headers:
            try:
                # Use a more flexible selector for text
                locator = page.get_by_text(header, exact=False).first
                await locator.wait_for(timeout=10000)
                print(f"✅ Found header: {header}")
            except Exception:
                print(f"❌ Could not find header: {header}")

        # 4. Check for Daily Mix specifically
        try:
            daily_mix = page.get_by_text("Daily Mix", exact=False).first
            await daily_mix.wait_for(timeout=5000)
            print("✅ Found Daily Mix!")
        except Exception:
            print("ℹ️ Daily Mix not found (might need more history or longer wait)")

        # 5. Take screenshots
        os.makedirs("/home/jules/verification", exist_ok=True)
        await page.screenshot(path="/home/jules/verification/home_final.png", full_page=True)

        # 6. Check Album Page Recommendations
        print("Checking Album Page recommendations...")
        try:
            # Look for an album link
            album_link = page.locator("a[href*='/album/']").first
            if await album_link.count() > 0:
                await album_link.click()
                await page.wait_for_load_state("networkidle")

                # Check for "More by" or "Similar"
                await asyncio.sleep(3) # Wait for recommendations to fetch
                recommendation_header = page.locator("h2:has-text('More by'), h2:has-text('Similar')").first
                await recommendation_header.wait_for(timeout=15000)
                print(f"✅ Found recommendations: {await recommendation_header.inner_text()}")
                await page.screenshot(path="/home/jules/verification/album_recommendations_final.png")
            else:
                print("Skipping album recommendations check: No album link found.")
        except Exception as e:
            print(f"❌ Failed to verify recommendations: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
