/* Sunami Service Worker — cache le shell pour usage hors-ligne */
const CACHE = 'sunami-v1';
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

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('fetch', (e) => {
  // Ne pas cacher les appels API
  if(e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});