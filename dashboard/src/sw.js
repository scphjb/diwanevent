// ════════════════════════════════════════════════════════
//  Diwan Event — Custom Service Worker
//  يدعم: Precaching, Routing, Push Notifications, Offline
// ════════════════════════════════════════════════════════
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

// ── تنشيط فوري والسيطرة على جميع النوافذ ──
self.skipWaiting();
clientsClaim();

// ── Precaching (يُحقن تلقائياً من vite-plugin-pwa) ──
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Navigation — إعادة توجيه React Router لـ index.html ──
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/, /^\/ws/],
  })
);

// ── API — Network First (مع مهلة 4 ثوانٍ للوضع غير المتصل) ──
registerRoute(
  /^https?.*\/api\/v1\/.*/i,
  new NetworkFirst({
    cacheName: 'diwan-api-cache',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
  }),
  'GET'
);

// ── الصور — Cache First ──
registerRoute(
  /^https?.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
  new CacheFirst({
    cacheName: 'diwan-images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
  'GET'
);

// ── Google Fonts — Cache First ──
registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: 'diwan-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  }),
  'GET'
);

// ── الترجمات — Stale While Revalidate ──
registerRoute(
  /\/locales\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'diwan-locales-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 })],
  }),
  'GET'
);

// ════════════════════════════════════════════════════════
//  🔔 معالج إشعارات Push
// ════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ديوان', body: event.data.text() };
  }

  const title = data.title || 'منصة ديوان 🔔';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: data.data || { url: '/' },
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ════════════════════════════════════════════════════════
//  🖱️ معالج النقر على الإشعار — يفتح البوابة الرقمية
// ════════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // إذا كانت النافذة مفتوحة بالفعل — ركّز عليها
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // وإلا افتح نافذة جديدة
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
