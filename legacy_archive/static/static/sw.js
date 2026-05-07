const CACHE_NAME = 'diwan-pwa-v2';
const DYNAMIC_CACHE = 'diwan-dynamic-v2';
const URLS_TO_CACHE = [
  '/',
  '/static/manifest.json',
  '/static/css/styles.css',
  '/static/js/admin.js',
  '/static/js/dashboard.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for API requests (to always get fresh data if online, fallback to cache if offline)
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for static assets and HTML
    e.respondWith(
      caches.match(e.request).then(cachedRes => {
        return cachedRes || fetch(e.request).then(res => {
          const resClone = res.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(e.request, resClone));
          return res;
        });
      })
    );
  }
});
