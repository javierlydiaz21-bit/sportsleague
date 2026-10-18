// Service worker de SportsLeague: muestra las notificaciones push (Web Push) aunque la web esté cerrada.
// El Notification Service envía { title, body, link } cifrado con las claves VAPID.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'SportsLeague', {
      body: data.body || '',
      icon: '/favicon.svg',
      lang: 'es',
      data: { link: data.link || '/panel/notificaciones' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.link || '/', self.location.origin).href;
  event.waitUntil(self.clients.openWindow(url));
});
