# Sunami TikTok Engine

Standalone creative renderer. It is deliberately isolated from the Sunami production app.

It uses OpenMotion (MIT) for deterministic React-to-MP4 rendering and borrows proven short-form patterns from public Remotion/TikTok templates: vertical 9:16 composition, word-level caption emphasis and frame-accurate scene timing.

Pipeline:
1. Query the deployed Sunami Pexels proxy in `scripts/fetch-clips.mjs`.
2. Download 8 portrait clips into `public/clips/`.
3. Render a 13-second TikTok-first composition to MP4.
4. Upload the MP4 as a GitHub Actions artifact.
