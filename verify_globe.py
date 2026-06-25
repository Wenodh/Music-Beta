from playwright.sync_api import sync_playwright
import time

def verify_globe():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating to Globe...")
        page.goto("http://localhost:5173/globe")

        print("Waiting for canvas...")
        page.wait_for_selector("canvas")
        time.sleep(5)

        page.screenshot(path="verification/globe_interaction_1.png")
        print("Took first screenshot.")

        print("Clicking a category...")
        page.click("button:has-text('Hindi')")
        time.sleep(5)
        page.screenshot(path="verification/globe_hindi.png")

        # Try to click a song point (near center)
        print("Clicking center of globe...")
        page.mouse.click(640, 360)
        time.sleep(2)
        page.screenshot(path="verification/globe_song_selected.png")

        browser.close()

if __name__ == "__main__":
    verify_globe()
