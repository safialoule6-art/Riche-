"""Run the Sunami autopilot and export exactly 50 accepted renders.

This is deliberately strict: a successful GitHub job must mean 50 real downloadable
videos exist. It must never report success for 0/50 or a partial batch.
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
        context = await browser.new_context(
            accept_downloads=True,
            viewport={"width": 390, "height": 844},
        )
        page = await context.new_page()
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        await page.goto(SITE, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("#libraryGrid", timeout=60000)

        # Never treat a generic 'finished' message as proof of success.
        await page.wait_for_function(
            """() => {
                const s = document.querySelector('#status')?.textContent || '';
                return s.includes('50/50') || s.includes('Autopilot arrêté') || s.includes('échec');
            }""",
            timeout=50 * 60 * 1000,
        )

        links = page.locator("#libraryGrid a.download")
        count = await links.count()
        status = await page.locator("#status").inner_text()
        if count != 50:
            raise RuntimeError(f"Autopilot did not produce 50 videos: {count}/50. Status: {status}")

        for i in range(count):
            link = links.nth(i)
            async with page.expect_download(timeout=120000) as download_info:
                await link.click()
            download = await download_info.value
            await download.save_as(str(OUT / (download.suggested_filename or f"sunami-{i+1:02d}.webm")))
            print(f"downloaded {i+1}/{count}")

        files = list(OUT.glob("*"))
        if len(files) != 50:
            raise RuntimeError(f"Only {len(files)}/50 video files were downloaded")

        (OUT.parent / "batch-errors.txt").write_text("\n".join(errors), encoding="utf-8")
        (OUT.parent / "batch-status.json").write_text(
            '{"status":"success","videos":50}\n', encoding="utf-8"
        )
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
