/* eslint-disable no-restricted-globals */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    console.error('[sw] Failed to parse push payload', err);
    payload = { title: 'התראה חדשה', body: event.data.text() };
  }

  const title = payload.title || 'התראה חדשה';
  const options = {
    body: payload.body,
    icon: payload.icon || '/templates/party.jpg',
    badge: payload.badge || '/templates/party.jpg',
    data: payload.data || {},
    tag: payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const url = new URL(client.url);
          if (url.pathname === targetUrl) {
            client.focus();
            return;
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});

