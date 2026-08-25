"""Run the browser-based Sunami autopilot and download its 50 accepted renders.

The creative page does all composition in-browser. This wrapper behaves like a human:
open the page, let the 50-video queue run, wait for the library, then download every
accepted render as an artifact.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SITE = "https://sunami-rho.vercel.app/creative.html?autopilot=50"
OUT = Path("agent/artifacts/videos")
OUT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True, viewport={"width": 1440, "height": 1000})
        page = await context.new_page()
        errors=[]
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        await page.goto(SITE, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("#libraryGrid", timeout=60000)

        # The browser renders one video at a time to avoid blowing up memory.
        await page.wait_for_function("document.querySelector('#libraryStatus')?.textContent?.includes('50 / 50')", timeout=50*60*1000)
        links = page.locator("#libraryGrid a.download")
        count = await links.count()
        if count < 1:
            raise RuntimeError("Autopilot finished without downloadable videos")

        for i in range(count):
            link = links.nth(i)
            async with page.expect_download(timeout=120000) as download_info:
                await link.click()
            download = await download_info.value
            await download.save_as(str(OUT / (download.suggested_filename or f"sunami-{i+1:02d}.webm")))
            print(f"downloaded {i+1}/{count}")

        (OUT.parent / "batch-errors.txt").write_text("\n".join(errors), encoding="utf-8")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
