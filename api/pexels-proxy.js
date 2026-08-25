// Same-origin Pexels video proxy for the free browser renderer.
// Only allows Pexels CDN URLs so the client can draw the clips to canvas without CORS tainting.
export const config = { runtime: 'edge' };

const ALLOWED_HOSTS = new Set(['videos.pexels.com', 'player.vimeo.com']);

export default async function handler(req) {
  const requestUrl = new URL(req.url);
  const target = requestUrl.searchParams.get('url');
  if (!target) return new Response('Missing url', { status: 400 });

  let url;
  try { url = new URL(target); } catch { return new Response('Invalid url', { status: 400 }); }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return new Response('URL not allowed', { status: 403 });
  }

  const upstream = await fetch(url.toString(), {
    headers: {
      ...(req.headers.get('range') ? { Range: req.headers.get('range') } : {}),
      'User-Agent': 'Sunami-Creative-Engine/1.0'
    }
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Pexels video unavailable', { status: upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type') || 'video/mp4';
  headers.set('content-type', contentType);
  headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  headers.set('access-control-allow-origin', '*');
  for (const name of ['content-length','content-range','accept-ranges']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
