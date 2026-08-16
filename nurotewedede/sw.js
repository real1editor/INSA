// NuroTewedede Service Worker - simple app-shell cache for offline use.
// Bump CACHE below (and re-register) whenever app shell assets change to avoid stale caches.
const CACHE = 'nurotewedede-v2';
const ASSETS = [
  './',
  './index.html',
  './tailwind.css',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never intercept API calls or cross-origin requests (Tailwind CDN, images, QR).
  // Only serve the cached app shell for same-origin GETs.
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: only offer the shell for navigation requests so that
          // sub-resource failures (fonts, images) surface as broken elements instead
          // of the whole page being replaced by the app shell.
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
