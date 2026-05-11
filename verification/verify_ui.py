from playwright.sync_api import sync_playwright, expect
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport to test the new MobileNowPlaying and UI
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5175")

            # Wait for content to load
            print("Waiting for content...")
            page.wait_for_timeout(5000)

            # Take home page screenshot
            print("Taking home page screenshot...")
            page.screenshot(path="verification/home_mobile.png")

            # Click on a song/album to start playback
            # We look for something that looks like an AlbumItem
            print("Attempting to play a song...")
            first_item = page.locator("div.group.cursor-pointer").first
            if first_item.is_visible():
                first_item.click()
                page.wait_for_timeout(2000)

                # If we are on mobile, clicking an item might play it or go to details
                # If it went to details, click the first song
                if "albums" in page.url:
                    print("On album page, playing first song...")
                    page.locator("button:has-text('▶'), div.group.cursor-pointer").first.click()
                    page.wait_for_timeout(2000)

                # Open Lyrics
                print("Opening Lyrics...")
                # We might need to find the 'More' menu first if on mobile, or check if player is visible
                # In our new implementation, clicking the player bar on mobile opens MobileNowPlaying
                player_bar = page.locator("div.fixed.bottom-0")
                if player_bar.is_visible():
                    player_bar.click()
                    page.wait_for_timeout(1000)
                    page.screenshot(path="verification/mobile_now_playing.png")

            # Search Verification
            print("Testing search...")
            search_input = page.get_by_placeholder("Search for songs, albums, artists...")
            search_input.fill("Kesariya")
            page.wait_for_timeout(3000)
            page.screenshot(path="verification/search_instant.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    os.makedirs("verification", exist_ok=True)
    run_verification()
