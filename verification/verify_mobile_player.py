from playwright.sync_api import sync_playwright, expect
import time

def test_mobile_player_menu(page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")

    # Take screenshot of initial state
    page.screenshot(path="verification/initial_state.png")

    # Try to find any song and click it
    songs = page.locator('div[role="button"], button, img').all()
    print(f"Found {len(songs)} potential clickables")

    # Click the first thing that looks like it might start music
    if len(songs) > 0:
        songs[0].click()
        time.sleep(2) # wait for player to appear
        page.screenshot(path="verification/after_click.png")

    # The mini player should appear
    mini_player = page.locator('[data-testid="mini-player"]')
    if mini_player.is_visible():
        mini_player.click()
        time.sleep(1)
        page.screenshot(path="verification/full_player.png")

        # Look for the options button - it has IoOptionsOutline
        # It's usually the one with the svg if we find the right container
        options_button = page.locator('button').filter(has=page.locator('svg')).all()
        for i, btn in enumerate(options_button):
            # The button we want is likely one of these
            # Let's try to click one that is in the upper right
            box = btn.bounding_box()
            if box and box['y'] < 300 and box['x'] > 200:
                btn.click()
                time.sleep(1)
                page.screenshot(path="verification/mobile_player_menu.png")
                break
    else:
        print("Mini player not found")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            test_mobile_player_menu(page)
        finally:
            browser.close()
