const CACHE_NAME = 'family-events-static-v7';
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

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.type === 'opaqueredirect') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    }),
  );
});

const DEFAULT_TITLE = 'אירועי משפחת מתתיהו';
const DEFAULT_BODY = 'התראה חדשה';

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

  console.log('[sw] raw push payload', payload);

  const title = (typeof payload.title === 'string' && payload.title.trim().length) ? payload.title : DEFAULT_TITLE;
  const bodyText = (typeof payload.body === 'string' && payload.body.trim().length) ? payload.body : DEFAULT_BODY;
  let decodedTitle = title;
  let decodedBody = bodyText;
  if (payload.encoded) {
    try {
      const titleBuffer = Uint8Array.from(atob(title), (c) => c.charCodeAt(0));
      decodedTitle = new TextDecoder('utf-8').decode(titleBuffer);
    } catch (error) {
      console.error('[sw] failed to decode title', error);
    }
    try {
      const bodyBuffer = Uint8Array.from(atob(bodyText), (c) => c.charCodeAt(0));
      decodedBody = new TextDecoder('utf-8').decode(bodyBuffer);
    } catch (error) {
      console.error('[sw] failed to decode body', error);
    }
  }

  const finalTitle = DEFAULT_TITLE;
  const finalBody = decodedBody && decodedBody.trim().length ? decodedBody : DEFAULT_BODY;

  console.log('[sw] showing notification', { finalTitle, finalBody });

  const options = {
    body: finalBody,
    icon: payload.icon || '/templates/party.jpg',
    badge: payload.badge || '/templates/party.jpg',
    lang: 'he',
    dir: 'rtl',
    data: payload.data,
    actions: payload.actions,
  };

  event.waitUntil(self.registration.showNotification(finalTitle, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawTarget = typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/';
  let targetUrl;
  try {
    targetUrl = new URL(rawTarget, self.location.origin).href;
  } catch (error) {
    targetUrl = self.location.origin;
  }

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
