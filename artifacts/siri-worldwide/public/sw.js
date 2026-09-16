const CACHE_NAME = 'siri-worldwide-v2';
const APP_ROOT = new URL('./', self.location).href;
const SHELL_URL = APP_ROOT;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        SHELL_URL,
        new URL('./manifest.json', self.location).href,
        new URL('./icon-192.png', self.location).href,
        new URL('./icon-512.png', self.location).href,
        new URL('./icon-maskable.png', self.location).href,
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('siri-worldwide-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match(SHELL_URL);
        }
        return Response.error();
      }),
  );
});