"""Sunami browser agent.

Free-first design:
- Playwright is the deterministic browser layer.
- Browser Use can be enabled when an LLM is available locally (Ollama) or via a BYOK provider.
- Without an LLM the script still performs deterministic QA and TikTok Creative Center research.

The production Sunami app is never modified by this script.
"""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from datetime import datetime, timezone

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "agent" / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)

SITE = os.getenv("SUNAMI_URL", "https://sunami-rho.vercel.app")
CREATIVE = f"{SITE.rstrip('/')}/creative.html"
TIKTOK = "https://ads.tiktok.com/creative/creativeCenter"

RULES = [
    "product hidden until late reveal",
    "problem is clear in first 2 seconds",
    "POV/UGC/reaction preferred",
    "no generic corporate stock",
    "caption hierarchy readable on mobile",
    "CTA is the final beat",
]

async def deterministic_run() -> dict:
    result = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "site": SITE,
        "creative": CREATIVE,
        "rules": RULES,
        "console_errors": [],
        "network_errors": [],
        "screenshots": [],
        "creative_controls": {},
        "tiktok_research": {},
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)

        page.on("console", lambda msg: result["console_errors"].append(msg.text) if msg.type == "error" else None)
        page.on("response", lambda response: result["network_errors"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)

        await page.goto(SITE, wait_until="domcontentloaded", timeout=45000)
        await page.screenshot(path=str(OUT / "sunami-mobile.png"), full_page=True)
        result["screenshots"].append("sunami-mobile.png")

        await page.goto(CREATIVE, wait_until="domcontentloaded", timeout=45000)
        await page.screenshot(path=str(OUT / "creative-mobile.png"), full_page=True)
        result["screenshots"].append("creative-mobile.png")
        result["creative_controls"] = await page.locator("button,select,textarea").evaluate_all(
            "els => els.map(e => ({tag:e.tagName,id:e.id,text:(e.innerText||e.value||'').slice(0,120),disabled:e.disabled}))"
        )

        # Public TikTok Creative Center research. We collect visible text only.
        research_page = await browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            await research_page.goto(TIKTOK, wait_until="domcontentloaded", timeout=45000)
            await research_page.wait_for_timeout(4000)
            text = (await research_page.locator("body").inner_text())[:12000]
            result["tiktok_research"] = {
                "url": TIKTOK,
                "visible_text_sample": text,
                "note": "Use Creative Center patterns as inspiration; never copy scripts or footage."
            }
            await research_page.screenshot(path=str(OUT / "tiktok-creative-center.png"), full_page=True)
            result["screenshots"].append("tiktok-creative-center.png")
        except Exception as exc:
            result["tiktok_research"] = {"error": str(exc), "url": TIKTOK}

        await browser.close()

    (OUT / "browser-report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result

async def main() -> None:
    result = await deterministic_run()
    print(json.dumps({
        "creative_controls": result["creative_controls"],
        "console_errors": result["console_errors"],
        "network_errors": result["network_errors"],
        "tiktok": bool(result["tiktok_research"]),
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
