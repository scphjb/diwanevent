// service-worker.js - Diwan Event Platform
const CACHE_VERSION = 'diwan-static-v5';
const API_CACHE = 'diwan-api-v5';

// Static files cache pool
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Target API paths for read-only offline caching
const CACHEABLE_API_ROUTES = [
  '/api/v1/sessions',
  '/api/v1/speakers',
  '/api/v1/sponsors',
  '/api/v1/events',
  '/api/v1/networking/profile/me'
];

// ── Service Worker installation ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Clean up legacy caches ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION && key !== API_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Request Router & Network Fallbacks ─────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Dynamic REST API Routes (GET requests only)
  if (url.pathname.includes('/api/v1/') && request.method === 'GET') {
    const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
      url.pathname.startsWith(route)
    );

    if (isCacheable) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(API_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Local network failure fallback to offline cache pool
            return caches.match(request).then((cached) => {
              if (cached) {
                const headers = new Headers(cached.headers);
                headers.set('X-Served-From', 'offline-cache');
                return new Response(cached.body, {
                  status: cached.status,
                  statusText: cached.statusText,
                  headers
                });
              }
              // Return a dynamic empty fallback JSON
              return new Response(
                JSON.stringify({
                  offline: true,
                  message: 'وضع عدم الاتصال: البيانات غير محفوظة محلياً',
                  data: []
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          })
      );
      return;
    }
  }

  // 2. Static Assets (Cache-First)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }
  // 3. Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // محاولة ثانية للتغلب على قيود المتصفح الصارمة للـ Navigation Requests عبر طلب نظيف للرابط
          return fetch(request.url);
        })
        .catch(() => {
          // إذا فشل الاتصال تماماً، نحن في وضع عدم الاتصال الحقيقي. نرجع index.html أو offline.html
          return caches.match('/index.html').then((cachedIndex) => {
            if (cachedIndex) return cachedIndex;
            return caches.match('/offline.html');
          });
        })
    );
  }
});

// ── Dynamic client controller channels ─────────────────────────
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
