// api/pexels.js
// Free stock-video search for Sunami's TikTok Creative Engine.
// IMPORTANT: set PEXELS_API_KEY in Vercel Environment Variables. Never expose it in client JS.

export const config = { runtime: "edge" };

const PEXELS_URL = "https://api.pexels.com/videos/search";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

function cleanQuery(value) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function scoreVideo(video, targetDuration = 1.2) {
  const files = Array.isArray(video.video_files) ? video.video_files : [];
  const portrait = files.find(f => Number(f.width) < Number(f.height));
  const width = portrait?.width || 0;
  const height = portrait?.height || 0;
  const ratio = height ? width / height : 0;
  const ratioScore = ratio >= 0.50 && ratio <= 0.62 ? 3 : ratio > 0 ? 1 : 0;
  const qualityScore = width >= 1080 ? 3 : width >= 720 ? 2 : 1;
  const duration = Number(video.duration) || 0;
  const durationScore = duration >= 2 && duration <= 12 ? 2 : 1;
  const distance = Math.abs(duration - targetDuration);
  return ratioScore + qualityScore + durationScore - Math.min(distance / 10, 1);
}

function pickFiles(video) {
  const files = Array.isArray(video.video_files) ? video.video_files : [];
  const portrait = files
    .filter(f => f?.link && Number(f.width) > 0 && Number(f.height) > 0)
    .filter(f => Number(f.height) >= Number(f.width))
    .sort((a, b) => {
      const a4k = Number(a.width) >= 1080 ? 1 : 0;
      const b4k = Number(b.width) >= 1080 ? 1 : 0;
      return b4k - a4k || Number(b.width) - Number(a.width);
    });

  const fallback = files
    .filter(f => f?.link)
    .sort((a, b) => Number(b.width) - Number(a.width));

  return (portrait[0] || fallback[0]) || null;
}

export default async function handler(req) {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return json({ error: "PEXELS_API_KEY manquante sur Vercel" }, 500);

  let input = {};
  try {
    if (req.method === "POST") input = await req.json();
    else {
      const url = new URL(req.url);
      input = Object.fromEntries(url.searchParams.entries());
      if (input.queries) input.queries = input.queries.split("|");
    }
  } catch (_) {
    return json({ error: "JSON invalide" }, 400);
  }

  const queries = Array.isArray(input.queries)
    ? input.queries.map(cleanQuery).filter(Boolean).slice(0, 8)
    : [cleanQuery(input.query)].filter(Boolean);

  if (!queries.length) return json({ error: "query ou queries requis" }, 400);

  const perPage = Math.min(Math.max(Number(input.per_page) || 8, 1), 20);
  const locale = cleanQuery(input.locale) || "fr-FR";
  const targetDuration = Math.min(Math.max(Number(input.target_duration) || 1.2, 0.5), 15);

  const results = [];

  for (const query of queries) {
    const url = new URL(PEXELS_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "portrait");
    url.searchParams.set("size", "medium");
    url.searchParams.set("locale", locale);
    url.searchParams.set("per_page", String(perPage));

    let response;
    try {
      response = await fetch(url.toString(), {
        headers: { Authorization: apiKey },
      });
    } catch (_) {
      return json({ error: "Impossible de joindre Pexels" }, 502);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return json({ error: `Pexels ${response.status}`, detail: text.slice(0, 300) }, response.status);
    }

    const data = await response.json();
    for (const video of Array.isArray(data.videos) ? data.videos : []) {
      const file = pickFiles(video);
      if (!file) continue;
      results.push({
        id: video.id,
        query,
        duration: Number(video.duration) || 0,
        width: Number(file.width) || 0,
        height: Number(file.height) || 0,
        url: file.link,
        image: video.image || "",
        photographer: video.user?.name || "Pexels creator",
        photographer_url: video.user?.url || "",
        pexels_url: video.url || "",
        score: scoreVideo(video, targetDuration),
      });
    }
  }

  // Deduplicate the same Pexels video returned by several semantic searches.
  const unique = [...new Map(results.map(v => [v.id, v])).values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return json({
    source: "pexels",
    count: unique.length,
    videos: unique,
    attribution: "Photos/Videos provided by Pexels",
  });
}
