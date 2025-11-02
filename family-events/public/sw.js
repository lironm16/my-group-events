const CACHE_NAME = 'family-events-static-v1';
const PRECACHE_URLS = ['/', '/manifest.json'];

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    }),
  );
});

const DEFAULT_TITLE = '\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9 \u05de\u05e9\u05e4\u05d7\u05ea \u05de\u05ea\u05ea\u05d9\u05d4\u05d5';
const DEFAULT_BODY = '\u05d4\u05ea\u05e8\u05d0\u05d4 \u05d7\u05d3\u05e9\u05d4';

self.addEventListener('push', (event) => {
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification(DEFAULT_TITLE, {
        body: DEFAULT_BODY,
        icon: '/templates/party.jpg',
        badge: '/templates/party.jpg',
      }),
    );
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    payload = { title: DEFAULT_TITLE, body: event.data.text() };
  }

  const title = payload.title || DEFAULT_TITLE;
  const options = {
    body: payload.body || DEFAULT_BODY,
    icon: payload.icon || '/templates/party.jpg',
    badge: payload.badge || '/templates/party.jpg',
    data: payload.data,
    actions: payload.actions,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
