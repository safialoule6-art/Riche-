# Sunami Agent Lab

This directory is isolated from the production Sunami application.

## Free-first stack

- **Playwright**: deterministic browser control and screenshots.
- **Browser Use**: optional open-source AI browser layer when a local/BYOK LLM is available.
- **Pexels**: free stock video API; `PEXELS_API_KEY` stays server-side in Vercel.
- **Remotion patterns**: TikTok captions/timing ideas are borrowed only from public open-source templates; no code is copied into production blindly.
- **FFmpeg / browser MediaRecorder**: local rendering/encoding.
- **GitHub Actions**: public-repository standard runners are free, so batch QA/render jobs can run without paying for a separate server.

## Agent loop

1. Research TikTok Creative Center / Top Ads / Trends.
2. Extract patterns, not scripts or footage.
3. Apply `SUNAMI_CREATIVE_CONTRACT.md`.
4. Generate 50 concepts.
5. Search Pexels for human/UGC/POV footage.
6. Render variants.
7. Reject anything that looks like a conventional app advertisement.
8. Keep the accepted batch in the local browser library and GitHub Actions artifacts.
9. Run browser QA against the production URL before trusting a batch.

## Important limitation

A truly autonomous LLM browser agent still needs an LLM. The free-first implementation therefore uses deterministic Playwright everywhere and supports Browser Use + a local Ollama model when available. It does not silently introduce a paid AI API.

## Reference projects reviewed

- Browser Use — open-source browser control for AI agents.
- Remotion `template-tiktok` — TikTok-style captions with Whisper.
- Remotion Superpowers — open-source render/review/fix loop patterns.
- OpenMontage — agentic production pipelines using Remotion/FFmpeg/free footage; AGPLv3, so it is treated as an architectural reference rather than copied into Sunami.
