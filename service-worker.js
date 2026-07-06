const CACHE_NAME = 'cmnm-v9-relatorios';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './manifest.json',
  './js/config.js',
  './js/ui.js',
  './js/api.js',
  './js/sandbox.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/conference.js',
  './js/participants.js',
  './js/payments.js',
  './js/sessions.js',
  './js/intervenients.js',
  './js/users.js',
  './js/scanner.js',
  './js/credentials.js',
  './js/attendance.js',
  './js/materials.js',
  './js/accommodations.js',
  './js/meals.js',
  './js/transport.js',
  './js/certificates.js',
  './js/reports.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
  );
});
