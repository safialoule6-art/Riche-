/* Sunami — service worker (PWA). Cache la coquille statique, jamais l'API. */
const CACHE = 'sunami-v1';
const ASSETS = ['/', '/app', '/styles.css', '/theme.js', '/app.js', '/landing.js', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Ne jamais intercepter l'API (streaming Groq, Supabase, etc.)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Navigations : réseau d'abord, repli sur le cache hors-ligne
    e.respondWith(fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/app') || caches.match('/'))));
    return;
  }
  // Autres ressources : cache d'abord, puis réseau (et on met en cache)
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return resp;
      }).catch(() => cached)
    )
  );
});
