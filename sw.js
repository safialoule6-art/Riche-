/* Sunami Service Worker — cache le shell pour usage hors-ligne */
const CACHE = 'sunami-v2';
const SHELL = [
  '/',
  '/app',
  '/index.html',
  '/app.html',
  '/landing.js',
  '/app.js',
  '/styles.css',
  '/theme.js',
  '/manifest.json'
];

// Nettoie les anciens caches à chaque nouvelle version
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('fetch', (e) => {
  // Ne pas cacher les appels API
  if(e.request.url.includes('/api/')) return;
  // Network-first : toujours essayer le réseau d'abord, fallback sur le cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre à jour le cache avec la version fraîche
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});