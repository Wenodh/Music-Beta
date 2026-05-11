import sys
import time
from playwright.sync_api import sync_playwright, Playwright

def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    logs = []
    def handle_console(msg):
        text = msg.text
        logs.append(text)
        print(f"BROWSER CONSOLE: {text}")

    page.on("console", handle_console)

    print("Navigating to app...")
    page.goto("http://localhost:5173", wait_until="networkidle")

    print("Waiting for 'Top Playlists' text...")
    try:
        page.wait_for_selector("text=Top Playlists", timeout=20000)
    except:
        print("Top Playlists not found.")
        sys.exit(1)

    print("Clicking the first playlist name...")
    # Find the Top Playlists section, then find a paragraph/text inside it that is likely a name
    playlist_section = page.locator("div:has(h2:text('Top Playlists'))")
    # AlbumItem renders name in a <p> tag
    first_playlist_name = playlist_section.locator("p.font-bold").first
    print(f"Clicking on playlist: {first_playlist_name.inner_text()}")
    first_playlist_name.click()

    # Wait for URL to change
    try:
        page.wait_for_function("window.location.pathname.includes('/playlists/') || window.location.pathname.includes('/albums/')", timeout=10000)
        print(f"Navigated to: {page.url}")
    except:
        print(f"Navigation failed. Current URL: {page.url}")
        page.screenshot(path="/home/jules/verification/nav_fail.png")
        sys.exit(1)

    # Wait for playlist page content
    page.wait_for_selector("h1", timeout=15000)
    print(f"Page h1: {page.locator('h1').inner_text()}")

    # Scroll for recommendations
    print("Scrolling for recommendations...")
    for _ in range(10):
        page.evaluate("window.scrollBy(0, 500)")
        time.sleep(0.5)

    # Wait for recommendation results
    print("Waiting for recommendation results...")
    time.sleep(10)

    # Check for recommendation headers
    headers = ["Similar Playlists", "More by", "Fans Also Like"]
    found_headers = []
    for h in headers:
        if page.get_by_text(h, exact=False).count() > 0:
            print(f"SUCCESS: Found recommendation header: {h}")
            found_headers.append(h)

    if not found_headers:
        print("No recommendation headers found on page.")
        # Check if we got the [Recommendations] logs
        rec_logs = [log for log in logs if "[Recommendations]" in log]
        print(f"Recommendation logs: {rec_logs}")
        page.screenshot(path="/home/jules/verification/final_fail_2.png")
        sys.exit(1)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
