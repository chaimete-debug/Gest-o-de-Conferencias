const CACHE_NAME = 'cmnm-v9-phase2-views-hotfix';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './manifest.json',
  './js/config.js',
  './js/sandbox.js',
  './js/api.js',
  './js/ui.js',
  './js/auth.js',
  './js/scanner.js',
  './js/dashboard.js',
  './js/conference.js',
  './js/participants.js',
  './js/credentials.js',
  './js/attendance.js',
  './js/materials.js',
  './js/accommodations.js',
  './js/meals.js',
  './js/transport.js',
  './js/certificates.js',
  './js/payments.js',
  './js/sessions.js',
  './js/intervenients.js',
  './js/users.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        ASSETS.map(asset => cache.add(new Request(asset, { cache: 'reload' })))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
  );
});
