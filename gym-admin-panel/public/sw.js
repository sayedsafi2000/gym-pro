const CACHE_NAME = 'gym-admin-panel-cache-v1';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/gym-logo.jpg',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (requestUrl.origin !== location.origin) return;
  if (requestUrl.pathname.startsWith('/api')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request).catch(() => response)
    )
  );
});