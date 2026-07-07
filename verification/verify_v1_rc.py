from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load Home Page
        print("Navigating to home...")
        page.goto("http://localhost:5173/")
        expect(page).to_have_title(re.compile("Vibe On"))

        # Take home screenshot
        page.screenshot(path="verification/home.png")

        # 2. Open Settings and check version
        print("Checking settings version...")
        page.get_by_label("Settings").click()
        expect(page.get_by_text("Vibe On Version 1.0.0")).to_be_visible()
        page.screenshot(path="verification/settings.png")

        # 3. Search and results
        print("Checking search...")
        search_input = page.get_by_placeholder("Search for songs, albums, artists...")
        search_input.fill("Imagine Dragons")
        # Wait for search results
        expect(page.get_by_role("button", name=re.compile("Songs \("))).to_be_visible(timeout=15000)
        page.screenshot(path="verification/search_results.png")

        browser.close()

if __name__ == "__main__":
    import re
    run_verification()
