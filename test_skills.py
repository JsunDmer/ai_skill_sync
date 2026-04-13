#!/usr/bin/env python3
import os
import re
from playwright.sync_api import sync_playwright

PORT = 3000
ZIP_PATH = "/Users/sunjian/Downloads/skills.zip"


def test_zip_import():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        page.goto(f"http://localhost:{PORT}/skills/new")
        page.wait_for_load_state("networkidle")
        print(f"Opened import page")

        page.locator('input[type="file"]').first.set_input_files(ZIP_PATH)

        page.wait_for_timeout(60000)
        page.screenshot(path="/tmp/after_upload.png", full_page=True)

        content = page.content()
        print("\n--- Import Results ---")

        # Check for error messages
        error_match = re.search(r"Failed to import: (\d+) file\(s\)", content)
        if error_match:
            print(f"Failed: {error_match.group(1)} files")
            # Look for specific error details
            error_details = re.findall(r"<li>([^<]+): ([^<]+)</li>", content)
            if error_details:
                print("Error details:")
                for fname, err in error_details[:5]:
                    print(f"  - {fname}: {err}")

        success_match = re.search(r"Successfully imported: (\d+)", content)
        if success_match:
            print(f"Successfully imported: {success_match.group(1)} skill(s)")

        if "View Skills" in content:
            page.locator("text=View Skills").click()
            page.wait_for_load_state("networkidle")
            page.screenshot(path="/tmp/skills_after_import.png", full_page=True)

            tabs = page.locator('[role="tab"]').all()
            print(f"\nTabs found: {len(tabs)}")
            for tab in tabs:
                print(f"  - {tab.text_content()}")

            cards = page.locator('.grid .card, [class*="Card"]').all()
            print(f"Skill cards visible: {len(cards)}")

        browser.close()
        print("\n=== Test Complete ===")


if __name__ == "__main__":
    test_zip_import()
